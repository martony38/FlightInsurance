const NUMBER_OF_FLIGHTS = 100;

const getRandomInt = max => {
  return Math.floor(Math.random() * Math.floor(max));
};

const getAirlineDesignators = airlineAddresses => {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const designators = new Set();

  while (designators.size < airlineAddresses.length) {
    designators.add(
      `${alpha[getRandomInt(alpha.length)]}${alpha[getRandomInt(alpha.length)]}`
    );
  }

  return designators;
};

const generateFlights = airlineAddresses => {
  const designators = getAirlineDesignators(airlineAddresses);

  const airlines = Array.from(designators).map((designator, index) => {
    return {
      designator,
      address: airlineAddresses[index]
    };
  });

  const flightNumbers = new Set(
    Array.from(Array(NUMBER_OF_FLIGHTS)).map(() => getRandomInt(9999) + 1)
  );

  const flights = Array.from(flightNumbers).map(number => {
    const airline = airlines[getRandomInt(airlines.length)];
    return {
      airline,
      number: `${airline.designator}${number}`,
      timestamp: Math.floor(Date.now() / 1000)
    };
  });

  return { flights, airlines };
};

export default generateFlights;
