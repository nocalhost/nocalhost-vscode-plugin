import i18n from "i18next";
import zhCN from './zh-CN';
import en from './en';

// language detect
i18n.init({
  lng: 'en',
  resources: {
    en,
    zhCN
  }
});

export default i18n;