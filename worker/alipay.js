const GATEWAY = 'https://openapi.alipay.com/gateway.do';

function pemToBytes(pem) {
  const b64 = (pem || '').replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function formatTimestamp() {
  const d = new Date(Date.now() + 8 * 3600000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

async function importPrivateKey(pem) {
  return crypto.subtle.importKey(
    'pkcs8',
    pemToBytes(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function importPublicKey(pem) {
  return crypto.subtle.importKey(
    'spki',
    pemToBytes(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

async function signParams(params, privateKeyPem) {
  const keys = Object.keys(params).filter((k) => params[k] !== undefined && params[k] !== '').sort();
  const content = keys.map((k) => `${k}=${params[k]}`).join('&');
  const key = await importPrivateKey(privateKeyPem);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(content));
  return toBase64(sig);
}

function buildGatewayUrl(params) {
  return `${GATEWAY}?${new URLSearchParams(params).toString()}`;
}

export function alipayConfigured(env) {
  return !!(env.ALIPAY_APP_ID && env.ALIPAY_PRIVATE_KEY && env.ALIPAY_PUBLIC_KEY);
}

/** 线上网站支付：手机用 wap.pay，电脑用 page.pay（非当面付/线下场景） */
export async function createOnlinePayUrl(env, { outTradeNo, totalYuan, subject, returnUrl, isMobile }) {
  if (!alipayConfigured(env)) return null;
  const notifyUrl = env.ALIPAY_NOTIFY_URL || 'https://fortell365-api.terencexu2521.workers.dev/payments/alipay/notify';
  const method = isMobile ? 'alipay.trade.wap.pay' : 'alipay.trade.page.pay';
  const productCode = isMobile ? 'QUICK_WAP_WAY' : 'FAST_INSTANT_TRADE_PAY';
  const bizContent = JSON.stringify({
    out_trade_no: outTradeNo,
    total_amount: totalYuan,
    subject: subject || 'Fortell365职业探索报告',
    product_code: productCode,
  });
  const params = {
    app_id: env.ALIPAY_APP_ID,
    method,
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: formatTimestamp(),
    version: '1.0',
    notify_url: notifyUrl,
    return_url: returnUrl,
    biz_content: bizContent,
  };
  params.sign = await signParams(params, env.ALIPAY_PRIVATE_KEY);
  return buildGatewayUrl(params);
}

export async function verifyNotify(env, params) {
  if (!alipayConfigured(env)) return false;
  const sign = params.sign;
  if (!sign) return false;
  const verifyParams = { ...params };
  delete verifyParams.sign;
  delete verifyParams.sign_type;
  const keys = Object.keys(verifyParams).filter((k) => verifyParams[k] !== undefined && verifyParams[k] !== '').sort();
  const content = keys.map((k) => `${k}=${verifyParams[k]}`).join('&');
  const key = await importPublicKey(env.ALIPAY_PUBLIC_KEY);
  return crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    Uint8Array.from(atob(sign), (c) => c.charCodeAt(0)),
    new TextEncoder().encode(content),
  );
}

export function parseNotifyBody(raw) {
  const params = {};
  for (const [k, v] of new URLSearchParams(raw)) params[k] = v;
  return params;
}

export function isMobileUserAgent(ua) {
  return /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(ua || '');
}
