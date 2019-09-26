let development = {
  host: "127.0.0.1", // Localhost (default: none)
  port: 8545, // Standard Ethereum port (default: none)
  network_id: "*" // Any network (default: none)
};

if (process.env.TRACE) {
  const ProviderEngine = require("web3-provider-engine");
  const WebsocketSubprovider = require("web3-provider-engine/subproviders/websocket.js");
  const {
    TruffleArtifactAdapter,
    RevertTraceSubprovider
  } = require("@0x/sol-trace");

  const defaultFromAddress = "0xF61728bB526AcA8fe211982dAA0F22b97B0B964A"; // Some ethereum address with test funds
  const projectRoot = ".";
  const solcVersion = "0.5.8";
  const artifactAdapter = new TruffleArtifactAdapter(projectRoot, solcVersion);
  const revertTraceSubprovider = new RevertTraceSubprovider(
    artifactAdapter,
    defaultFromAddress
  );

  const providerEngine = new ProviderEngine();
  providerEngine.addProvider(revertTraceSubprovider);
  providerEngine.addProvider(
    new WebsocketSubprovider({ rpcUrl: "http://localhost:8545" })
  );
  providerEngine.start();

  providerEngine.send = providerEngine.sendAsync.bind(providerEngine);
  development.provider = providerEngine;
  development.host = "none";
  development.port = "none";
}

module.exports = {
  networks: {
    development
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      // version: "0.5.1",    // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      // settings: {          // See the solidity docs for advice about optimization and evmVersion
      //  optimizer: {
      //    enabled: false,
      //    runs: 200
      //  },
      //  evmVersion: "byzantium"
      // }
    }
  }
};
