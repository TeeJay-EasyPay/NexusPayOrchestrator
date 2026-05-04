// ONLY showing modified useEffect section

useEffect(() => {
  const hasResendParams =
    params.amount ||
    params.country ||
    params.firstName ||
    params.accountNumber ||
    params.mobileNumber;

  if (!hasResendParams) return;

  const resendAmount = getStringParam(params.amount);
  const resendCountry = getStringParam(params.country);
  const resendPayoutMethod = getStringParam(params.payoutMethod) as PayoutMethod;
  const resendProvider = getStringParam(params.provider);

  if (resendAmount) {
    setAmount(resendAmount);
  }

  if (resendCountry) {
    const corridor = corridors.find((item) => item.country === resendCountry);

    if (corridor) {
      const payoutMethod =
        resendPayoutMethod === "BANK" || resendPayoutMethod === "MOBILE_WALLET"
          ? resendPayoutMethod
          : corridor.payoutMethods[0].type;

      const payoutConfig = corridor.payoutMethods.find(
        (item) => item.type === payoutMethod
      );

      setSelectedCountry(corridor.country);
      setSelectedPayoutMethod(payoutMethod);
      setSelectedProvider(resendProvider || payoutConfig?.providers[0] || "");
    }
  }

  setFirstName(getStringParam(params.firstName));
  setMiddleName(getStringParam(params.middleName));
  setSurname(getStringParam(params.surname));
  setBankCode(getStringParam(params.bankCode));
  setAccountNumber(getStringParam(params.accountNumber));
  setMobileNumber(getStringParam(params.mobileNumber));
}, []);
