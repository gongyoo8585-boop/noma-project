// modules/payment/jobs/index.js

const { runPaymentCleanup } = require('./payment.cleanup.job');

const CLEANUP_INTERVAL = Number(process.env.PAYMENT_CLEANUP_INTERVAL || 60000);

let paymentJobTimer = null;
let isRunning = false;

/**
 * payment cleanup 1회 실행
 */
async function executePaymentCleanup() {
  if (isRunning) return;

  try {
    isRunning = true;
    await runPaymentCleanup();
  } catch (err) {
    console.error('[payment job] executePaymentCleanup error:', err.message);
  } finally {
    isRunning = false;
  }
}

/**
 * payment jobs 시작
 */
function startPaymentJobs() {
  try {
    // 중복 실행 방지
    if (paymentJobTimer) {
      console.log('[payment job] already started');
      return paymentJobTimer;
    }

    console.log('[payment job] started');

    // 서버 시작 직후 1회 실행
    executePaymentCleanup();

    // 주기 실행
    paymentJobTimer = setInterval(() => {
      executePaymentCleanup();
    }, CLEANUP_INTERVAL);

    return paymentJobTimer;
  } catch (err) {
    console.error('[payment job] startPaymentJobs error:', err.message);
    return null;
  }
}

/**
 * payment jobs 중지
 */
function stopPaymentJobs() {
  try {
    if (paymentJobTimer) {
      clearInterval(paymentJobTimer);
      paymentJobTimer = null;
      console.log('[payment job] stopped');
    }
  } catch (err) {
    console.error('[payment job] stopPaymentJobs error:', err.message);
  }
}

module.exports = {
  startPaymentJobs,
  stopPaymentJobs,
  executePaymentCleanup,
};