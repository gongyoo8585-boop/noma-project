// modules/payment/validators/payment.validator.js

/**
 * ============================================
 * 공통 유틸
 * ============================================
 */
function isString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isNumber(v) {
  return typeof v === 'number' && !isNaN(v) && isFinite(v);
}

function isObjectIdLike(v) {
  return isString(v) && v.length >= 8; // loose check (Mongo 대응)
}

/**
 * ============================================
 * 결제 생성 검증
 * ============================================
 */
exports.validateCreatePaymentInput = (data = {}) => {
  const errors = [];

  if (!isString(data.title)) {
    errors.push('INVALID_TITLE');
  }

  if (!isNumber(data.amount) || data.amount <= 0) {
    errors.push('INVALID_AMOUNT');
  }

  if (data.reservationId !== undefined && data.reservationId !== null) {
    if (!isObjectIdLike(data.reservationId)) {
      errors.push('INVALID_RESERVATION_ID');
    }
  }

  if (!isString(data.user)) {
    errors.push('INVALID_USER');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * ============================================
 * 승인 검증
 * ============================================
 */
exports.validateApproveInput = (data = {}) => {
  const errors = [];

  if (!isString(data.orderId)) {
    errors.push('INVALID_ORDER_ID');
  }

  if (!isString(data.pgToken)) {
    errors.push('INVALID_PG_TOKEN');
  }

  if (!isString(data.userId)) {
    errors.push('INVALID_USER_ID');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * ============================================
 * 취소 검증
 * ============================================
 */
exports.validateCancelInput = (data = {}) => {
  const errors = [];

  if (!isString(data.paymentId)) {
    errors.push('INVALID_PAYMENT_ID');
  }

  if (data.reason !== undefined && data.reason !== null) {
    if (!isString(data.reason)) {
      errors.push('INVALID_CANCEL_REASON');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * ============================================
 * 환불 검증
 * ============================================
 */
exports.validateRefundInput = (data = {}) => {
  const errors = [];

  if (!isString(data.paymentId)) {
    errors.push('INVALID_PAYMENT_ID');
  }

  if (data.amount !== undefined && data.amount !== null) {
    if (!isNumber(data.amount) || data.amount <= 0) {
      errors.push('INVALID_REFUND_AMOUNT');
    }
  }

  if (data.reason !== undefined && data.reason !== null) {
    if (!isString(data.reason)) {
      errors.push('INVALID_REFUND_REASON');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * ============================================
 * 조회 검증
 * ============================================
 */
exports.validateQueryInput = (query = {}) => {
  const errors = [];

  if (query.limit !== undefined) {
    const l = Number(query.limit);
    if (isNaN(l) || l <= 0 || l > 100) {
      errors.push('INVALID_LIMIT');
    }
  }

  if (query.skip !== undefined) {
    const s = Number(query.skip);
    if (isNaN(s) || s < 0) {
      errors.push('INVALID_SKIP');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};