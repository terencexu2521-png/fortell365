Page({
  data: {
    agreed: false,
    features: null,
  },
  onLoad() {
    const agreed = !!wx.getStorageSync('privacy_agreed');
    this.setData({ agreed });
    const api = require('../../utils/api.js');
    api.getFeatures().then((res) => {
      this.setData({ features: res.data });
    }).catch(() => {});
  },
  onAgreeChange(e) {
    this.setData({ agreed: e.detail.value.length > 0 });
  },
  startExplore() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意隐私说明', icon: 'none' });
      return;
    }
    wx.setStorageSync('privacy_agreed', true);
    wx.navigateTo({ url: '/pages/input/input' });
  },
  goProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },
});
