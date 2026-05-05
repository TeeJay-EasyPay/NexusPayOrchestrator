// CHANGE ONLY THIS PART AT BOTTOM

  const handleContinue = () => {
    if (!selectedRoute) return;
    router.push("/funding"); // 🔥 WAS /track
  };