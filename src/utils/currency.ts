export const getCurrencyByCountry = (country: string): string => {
  const euroCountries = [
    "Vatican City", "Germany", "Spain", "Estonia", "France", "Finland",
    "Greece", "Austria", "Portugal", "Andorra", "Belgium", "Cyprus",
    "Slovenia", "Slovakia", "San Marino", "Latvia", "Luxembourg",
    "Lithuania", "Montenegro", "Monaco", "Malta", "Netherlands",
    "Croatia", "Ireland", "Italy"
  ];

  switch (country) {
    case "United Kingdom":
      return "GBP";
    case "Canada":
      return "CAD";
    case "Australia":
      return "AUD";
    case "India":
      return "INR";
    default:
      if (euroCountries.includes(country)) {
        return "EUR";
      }
      return "USD";
  }
};
