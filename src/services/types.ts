export enum SocketEventName {
  // 提审
  submitDraft = "submit-draft",

  // 审核通过
  approveDraft = "approve-draft",

  // 审核拒绝
  rejectDraft = "reject-draft",

  // 发布
  publishDraft = "publish-draft",
}

export interface UserEntity {
  uid?: string;
  uname?: string;
  [key: string]: any;
}

export interface SocketEvent {
  from?: UserEntity | string | number;
  to?: UserEntity | string | number;
  eventName: SocketEventName | string;
  data: {
    [key: string]: any;
  };
}
