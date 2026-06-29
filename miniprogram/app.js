App({
  globalData: {
    birthForm: null,
    paipanResult: null,
  },
  onLaunch() {
    if (typeof wx.onNeedPrivacyAuthorization === 'function') {
      wx.onNeedPrivacyAuthorization((resolve) => {
        if (wx.getStorageSync('privacy_agreed')) {
          resolve({ event: 'agree', buttonId: 'agree-privacy-btn' });
        } else {
          this.globalData.pendingPrivacyResolve = resolve;
        }
      });
    }
  },
});
