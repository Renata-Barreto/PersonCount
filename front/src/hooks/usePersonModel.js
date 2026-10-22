import { useEffect, useState } from "react";
import { acquireModel } from "../services/modelService";

export function usePersonModel() {
  const [state, setState] = useState({
    model: null,
    status: "loading",
    progress: 0,
  });
  useEffect(() => {
    let active = true;
    const resource = acquireModel((progress) => {
      if (active)
        setState((current) =>
          current.status === "loading" ? { ...current, progress } : current,
        );
    });
    resource.promise.then(
      (model) => {
        if (active) setState({ model, status: "ready", progress: 1 });
      },
      () => {
        if (active) setState({ model: null, status: "error", progress: 0 });
      },
    );
    return () => {
      active = false;
      resource.release();
    };
  }, []);
  return state;
}
