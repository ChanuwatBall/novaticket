const toNumber = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const firstNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const amount = toNumber(value);
    if (Number.isFinite(amount)) return amount;
  }
  return 0;
};

const getCompanySalesSettings = (company?: any) => {
  const settings = company?.company_sales_settings;
  return Array.isArray(settings) ? settings[0] : settings;
};

const sumAddOns = (items: any[] = []) =>
  items.reduce((sum, item) => {
    const price = firstNumber(item?.price, item?.item?.price, item?.addOn?.price, item?.addon?.price);
    const qty = firstNumber(item?.qty, item?.quantity, 1);
    return sum + price * qty;
  }, 0);

export const calculatePaymentSummary = (booking: any, company?: any) => {
  const passengers = booking?.passengers || [];
  const seatCount = firstNumber(
    booking?.seatCount,
    booking?.seats?.length,
    passengers.length,
  );
  const discount = firstNumber(booking?.discount);
  const serviceTotal = firstNumber(
    booking?.totalMealCost,
    booking?.mealCost,
    booking?.meal_cost,
    booking?.addonTotal,
    booking?.addOnTotal,
    booking?.addOnsTotal,
    booking?.addonsTotal,
    booking?.serviceTotal,
    booking?.service_total,
    sumAddOns(booking?.addOns || booking?.addons || []),
  );
  const total = firstNumber(booking?.total);
  const explicitFee = firstNumber(
    booking?.feeTotal,
    booking?.fee_total,
    booking?.fee_amt,
    booking?.feeAmt,
    booking?.fee,
  );
  const explicitOmiseQrFee = firstNumber(
    booking?.omiseQrFee,
    booking?.omise_qr_fee_amt,
    booking?.omiseQrFeeAmt,
  );
  const pricePerSeat = firstNumber(booking?.pricePerSeat, booking?.price_per_seat);
  const settings = getCompanySalesSettings(company);
  const companyFee = firstNumber(settings?.fee);
  const omiseQrFeePercent = firstNumber(
    booking?.omiseQrFeePercent,
    booking?.omise_qr_fee_percent,
    settings?.omise_qr_fee,
  );

  const explicitSeatSubtotal = [
    booking?.subtotal,
    booking?.seatSubtotal,
    booking?.seat_subtotal,
  ].find((value) => value !== undefined && value !== null && value !== "");
  const fallbackSeatSubtotal = pricePerSeat * Math.max(seatCount, 0);
  const seatSubtotal = explicitSeatSubtotal !== undefined
    ? toNumber(explicitSeatSubtotal)
    : fallbackSeatSubtotal > 0
      ? fallbackSeatSubtotal
      : Math.max(total - serviceTotal - explicitFee - explicitOmiseQrFee + discount, 0);
  const baseTotal = Math.max(seatSubtotal + serviceTotal - discount, 0);
  const computedOmiseQrFee = Math.round(baseTotal * omiseQrFeePercent / 100);
  const feeTotal = explicitFee + explicitOmiseQrFee || companyFee + computedOmiseQrFee;

  return {
    seatCount,
    seatSubtotal,
    discount,
    serviceTotal,
    feeTotal,
    total,
  };
};
