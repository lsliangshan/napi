export enum PuppeteerTaskType {
  getDailyPosition = "getDailyPosition",

  getSmsCode = "getSmsCode",

  loginThirdPlatform = "loginThirdPlatform",

  deliver = "deliver",

  /**
   * 自动投递每日职位
   */
  autoDeliverDailyPositions = "autoDeliverDailyPositions",

  validateLoginStatus = "validateLoginStatus",
}

export interface PuppeteerTaskData {
  [key: string]: any;
}
