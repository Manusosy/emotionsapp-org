// Limited list of allowed countries for Mood Mentors
export const mentorCountries = [
  { code: "KE", name: "Kenya" },
  { code: "UG", name: "Uganda" },
  { code: "RW", name: "Rwanda" },
  { code: "SL", name: "Sierra Leone" },
  { code: "GH", name: "Ghana" }
];

// Function to check if a country is allowed for mood mentors
export const isCountryAllowedForMentors = (countryCode: string): boolean => {
  return mentorCountries.some(country => country.code === countryCode);
}; 