"""Replaces YOLOv8's nearest-neighbour Resize nodes with an equivalent ConvTranspose.

onnxruntime-web's WebGL provider does not implement Resize(mode="nearest").
A depthwise 2x2 ConvTranspose of ones with stride 2 produces the same 2x
upsampling bit for bit, and runs on every provider.

Usage: python scripts/patch_yolo_resize.py input.onnx output.onnx   (needs `pip install onnx`)
"""
import sys

import numpy as np
import onnx
from onnx import helper, numpy_helper, shape_inference

source, target = sys.argv[1:3]
model = onnx.load(source)
inferred = shape_inference.infer_shapes(model)
shapes = {
    v.name: [d.dim_value for d in v.type.tensor_type.shape.dim]
    for v in list(inferred.graph.value_info) + list(inferred.graph.input)
}

nodes = []
for node in model.graph.node:
    if node.op_type != "Resize":
        nodes.append(node)
        continue
    channels = shapes[node.input[0]][1]
    weights = node.name.replace("/", "_") + "_w"
    model.graph.initializer.append(
        numpy_helper.from_array(np.ones((channels, 1, 2, 2), np.float32), weights)
    )
    nodes.append(
        helper.make_node(
            "ConvTranspose",
            [node.input[0], weights],
            list(node.output),
            name=node.name + "_convT",
            group=channels,
            kernel_shape=[2, 2],
            strides=[2, 2],
        )
    )

del model.graph.node[:]
model.graph.node.extend(nodes)
used = {name for node in model.graph.node for name in node.input}
kept = [init for init in model.graph.initializer if init.name in used]
del model.graph.initializer[:]
model.graph.initializer.extend(kept)
onnx.checker.check_model(model)
onnx.save(model, target)
