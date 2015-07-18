var username = 'csgo_case_bot';
var password = 'write-BROUGHT-heart-MATTER';
var apikey = 'A627DEED026160E1D55D7B5C86141240';
var admin = '76561198083592618';

var readline = require('readline');
var fs = require('fs');
var winston = require('winston');
var Steam = require('steam');
Steam.Offers = require('steam-tradeoffers');
Steam.UserInfo = require('steam-userinfo');

Steam.UserInfo.setup(apikey);

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      level: 'debug'
    }),
    new (winston.transports.File)({
      level: 'info',
      timestamp: true,
      filename: 'dump.log',
      json: false
    })
  ]
})

var client = new Steam.SteamClient();
var offers = new Steam.Offers();

function sendMessage(steamID, message) {
  logger.info('--> [' + steamID + '] MSG: ' + message);
  client.sendMessage(steamID, message);
}

if(fs.existsSync('servers.json')) {
  Steam.servers = JSON.parse(fs.readFileSync('servers.json'));
}

var sentryfile;
if(fs.existsSync('sentryfile.' + username + '.hash')) {
  sentryfile = fs.readFileSync('sentryfile.' + username + '.hash');
}

client.logOn({
  accountName: username,
  password: password,
  shaSentryfile: sentryfile
});

client.on('error', function(e) {
  if(e.eresult === Steam.EResult.AccountLogonDenied) {
    rl.question('Steam Gaurd Code: ', function(code) {
      client.logOn({
        accountName: username,
        password: password,
        authCode: code
      });
    });
  } else {
    logger.error('Steam Error: ' + e.eresult);
  }
});

client.on('sentry', function(sentry) {
  logger.info('Got new sentry file hash from Steam. Saving.');
  fs.writeFile('sentryfile.' + username + '.hash', sentry);
});

client.on('loggedOn', function() {
  logger.info('Logged onto Steam');
  client.setPersonaName('CSGO Case Bot');
  client.setPersonaState(Steam.EPersonaState.Offline);
});

client.on('webSessionID', function(sessionid) {
  client.webLogOn(function(cookie) {
    offers.setup({
      sessionID: sessionid,
      webCookie: cookie
    });
    logger.info('Logged into web');
    client.setPersonaState(Steam.EPersonaState.LookingToTrade);
  });
});

client.on('friend', function(steamID, relationship) {
  if (relationship == Steam.EFriendRelationship.RequestRecipient) {
    logger.info('[' + steamID + '] Accepted friend request');
    client.addFriend(steamID);
    Steam.UserInfo.getUserInfo(steamID, function(e, data) {
      if (e) throw e;
      offers.loadPartnerInventory({partnerSteamId: steamID, appId: 730, contextId: 2}, function(e, items) {
        var cases = 0;
        items.forEach(function(item) {
          if(item.name.indexOf("Case") > -1) {
            cases++
          }
        });
        sendMessage(steamID, 'Hello '+data.response.players[0].personaname +
        ', it looks like you have ' + cases + (cases === 1 ? ' case' : ' cases') +
        '. Would you be willing to donate any to keep me alive?')
      });
    })
  } else if (relationship == Steam.EFriendRelationship.None) {
    logger.info('[' + steamID + '] Un-friended');
  }
});

client.on('friendMsg', function(steamID, message, type) {
  if (type === Steam.EChatEntryType.ChatMsg) {
    logger.info('<-- [' + steamID + '] MSG: ' + message);

    var request = message.match(/(\w+) (\d+) (\w+)/i)
    var msg = message.match(/(\w+)/)
    if(msg && msg[1] === 'help') {
      sendMessage(steamID, 'I am a case dispenser, you can get 10 cases free. After that you have to pay with cheap skins\n' +
      'Commands:\n' +
      '\t!request <amount> <case>: sends a trade offer for that number of cases. e.g. !request 10 falchion\n' +
      '\t!inventory: returns how many cases I have')
    } else if (msg && (msg[1] === 'inventory' || msg[1] === 'i')) {
      
    } else if (request && (request[1] === 'request' || request[1] === 'r')) {
      sendMessage(steamID, 'You have requested '+request[2]+' '+request[3]+' cases. Please check your trade offers')
    } else if (msg) {
      sendMessage(steamID, 'Sorry, that command is not recognized.')
    } else {
      sendMessage(steamID, 'Sorry, please enter a command. !help for list of commands')
    }
  }
});