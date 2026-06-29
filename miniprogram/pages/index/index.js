const privacy = require('../../data/privacy.js');

Page({
  data: {
    features: null,
    showPrivacyModal: false,
    pendingAction: '',
    privacySummary: privacy.summary,
  },
  onLoad() {
    const api = require('../../utils/api.js');
    api.getFeatures().then((res) => {
      this.setData({ features: res.data });
    }).catch(() => {});
  },
  startExplore() {
    if (wx.getStorageSync('privacy_agreed')) {
      wx.navigateTo({ url: '/pages/input/input' });
      return;
    }
    this.setData({ showPrivacyModal: true, pendingAction: 'explore' });
  },
  goProfile() {
    if (wx.getStorageSync('privacy_agreed')) {
      wx.navigateTo({ url: '/pages/profile/profile' });
      return;
    }
    this.setData({ showPrivacyModal: true, pendingAction: 'profile' });
  },
  openPrivacyFull() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },
  onPrivacyAgree() {
    wx.setStorageSync('privacy_agreed', true);
    wx.setStorageSync('privacy_agreed_at', Date.now());
    const app = getApp();
    if (app.globalData.pendingPrivacyResolve) {
      app.globalData.pendingPrivacyResolve({ event: 'agree', buttonId: 'agree-privacy-btn' });
      app.globalData.pendingPrivacyResolve = null;
    }
    const action = this.data.pendingAction;
    this.setData({ showPrivacyModal: false, pendingAction: '' });
    if (action === 'profile') {
      wx.navigateTo({ url: '/pages/profile/profile' });
    } else {
      wx.navigateTo({ url: '/pages/input/input' });
    }
  },
  onPrivacyReject() {
    this.setData({ showPrivacyModal: false, pendingAction: '' });
    wx.showModal({
      title: '无法继续',
      content: '您拒绝了隐私保护指引，无法使用排盘与报告功能。如需使用，请重新点击并选择同意。',
      showCancel: false,
    });
  },
  closePrivacyModal() {
    this.setData({ showPrivacyModal: false, pendingAction: '' });
  },
});
