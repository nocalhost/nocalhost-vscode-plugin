import i18next from "i18next";

class I18nextUtil {
  constructor() {}

  async init(resources, language) {
    await i18next.init({
      lng: language,
      resources,
    });
  }

  t(key) {
    return i18next.t(key);
  }
}

export default new I18nextUtil();
