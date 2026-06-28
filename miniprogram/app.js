App({
  globalData: {
    birthForm: null,
    paipanResult: null,
  },
  onLaunch() {
    const agreed = wx.getStorageSync('privacy_agreed');
    if (agreed) this.globalData.privacyAgreed = true;
  },
});
