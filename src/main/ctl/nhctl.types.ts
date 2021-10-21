export type AssociateQueryResult = {
  kubeconfig_path: string;
  svc_pack: {
    ns: string;
    app: string;
    svc_type: string;
    svc: string;
    container: string;
  };
  syncthing_status: {
    msg: string;
    status: string;
  };
};
