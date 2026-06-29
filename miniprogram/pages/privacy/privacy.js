Page({
  data: {
    content: '',
    developerName: '',
    contactEmail: '',
    updateDate: '',
    effectiveDate: '',
  },
  onLoad() {
    const privacy = require('../../data/privacy.js');
    this.setData({
      content: privacy.fullText,
      developerName: privacy.developerName,
      contactEmail: privacy.contactEmail,
      updateDate: privacy.updateDate,
      effectiveDate: privacy.effectiveDate,
    });
    wx.setNavigationBarTitle({ title: '隐私保护指引' });
  },
});
