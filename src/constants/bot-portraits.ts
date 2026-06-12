export const botPortraits = {
  pebble: require('../../assets/images/bots/bot_pebble.png'),
  momo: require('../../assets/images/bots/bot_momo.png'),
  tuk: require('../../assets/images/bots/bot_tuk.png'),
  sable: require('../../assets/images/bots/bot_sable.png'),
  vex: require('../../assets/images/bots/bot_vex.png'),
  onyx: require('../../assets/images/bots/bot_onyx.png'),
  warden: require('../../assets/images/bots/bot_warden.png'),
  juno: require('../../assets/images/bots/bot_juno.png'),
  riko9: require('../../assets/images/bots/bot_riko9.png'),
  mads: require('../../assets/images/bots/bot_mads.png'),
  echo: require('../../assets/images/bots/bot_echo.png'),
  nyx: require('../../assets/images/bots/bot_nyx.png'),
} as const;

export type BotPortraitKey = keyof typeof botPortraits;
