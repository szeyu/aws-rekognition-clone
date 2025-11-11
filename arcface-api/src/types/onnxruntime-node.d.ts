declare module "onnxruntime-node" {
  export const InferenceSession: any;
  export const Tensor: any;
  export const env: any;
  const ort: {
    InferenceSession: any;
    Tensor: any;
    env: any;
    [key: string]: any;
  };
  export = ort;
}


