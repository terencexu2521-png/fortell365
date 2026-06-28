Page({
  data: {
    name: '',
    gender: '',
    baziString: '',
    pillars: [],
    solarTimeNote: '',
    birthTimeText: '',
    birthPlace: '',
    loading: false,
  },
  onLoad() {
    const app = getApp();
    const form = app.globalData.birthForm;
    const paipan = app.globalData.paipanResult;
    if (!form || !paipan) {
      wx.showToast({ title: '请先填写信息', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.form = form;
    const timeText = `${String(form.hour).padStart(2, '0')}:${String(form.minute).padStart(2, '0')}`;
    this.setData({
      name: form.name,
      gender: form.gender === 'female' ? '女' : '男',
      baziString: paipan.baziString,
      pillars: paipan.pillars || [],
      solarTimeNote: paipan.solarTimeNote || '',
      birthTimeText: timeText,
      birthPlace: form.birthPlace || '',
    });
  },
  async confirmGenerate() {
    if (!this.form) return;
    this.setData({ loading: true });
    wx.showLoading({ title: '正在生成报告…', mask: true });
    try {
      const api = require('../../utils/api.js');
      const { USE_DEV_LOGIN } = require('../../config.js');
      try {
        await api.ensureLogin();
      } catch (loginErr) {
        if (!USE_DEV_LOGIN) throw loginErr;
        // 探路模式：登录失败也继续（报告先存服务器，认证通过后再绑账号）
      }
      const res = await api.generate({
        name: this.form.name,
        gender: this.form.gender,
        baziString: this.data.baziString,
        channel: 'miniprogram',
      });
      const reportId = res.data.reportId;
      if (api.getToken()) {
        await api.claimReport(reportId).catch(() => {});
      }
      wx.hideLoading();
      wx.redirectTo({ url: '/pages/report/report?id=' + reportId });
    } catch (err) {
      wx.hideLoading();
      wx.showModal({
        title: '生成失败',
        content: err.message || '请稍后重试',
        showCancel: false,
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  goBack() {
    wx.navigateBack();
  },
});
