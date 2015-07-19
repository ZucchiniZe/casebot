var username = 'csgo_case_bot';
var password = 'write-BROUGHT-heart-MATTER';
var apikey = 'A627DEED026160E1D55D7B5C86141240';
var admin = '76561198083592618';

var readline = require('readline');
var fs = require('fs');
var winston = require('winston');
var Steam = require('steam');
Steam.Trade = require('steam-trade');
Steam.Offers = require('steam-tradeoffers');
Steam.UserInfo = require('steam-userinfo');

Steam.UserInfo.setup(apikey);

var inTrade = false;
var myInv;

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
});

var client = new Steam.SteamClient();
var offers = new Steam.Offers();
var trade = new Steam.Trade();

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
    cookie.forEach(function(part) {
      trade.setCookie(part.trim());
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
            cases++;
          }
        });
        sendMessage(steamID, 'Hello '+data.response.players[0].personaname +
        ', it looks like you have ' + cases + (cases === 1 ? ' case' : ' cases') +
        '. Would you be willing to donate any to keep me alive?');
      });
    });
  } else if (relationship == Steam.EFriendRelationship.None) {
    logger.info('[' + steamID + '] Un-friended');
  }
});

var casenames = {
  chroma: /chroma|chroma case|chr|c/i,
  chroma2: /chroma 2|chroma 2 case|chroma2|chr2|c2/i,
  falchion: /falchion|falchion case|fal|f/i,
  breakout: /breakout|breakout case|bre|bt/i,
  phoenix: /phoenix|phoenix case|pho|p/i,
  vanguard: /vanguard|vanguard case|van|v/i,
  winter: /winter|winter case|win|w/i,
  esport2013: /esport 2013|esport 2013 case|e13/i,
  esport2013w: /esport 2013 winter|esport 2013 winter case|esport winter|ew/i,
  esport2014: /esport 2014|esport 2014 case|e14/i,
  bravo: /operation bravo|bravo|bo/i
};

client.on('friendMsg', function(steamID, message, type) {
  if (type === Steam.EChatEntryType.ChatMsg) {
    logger.info('<-- [' + steamID + '] MSG: ' + message);

    var msg = message.match(/(\w+)/);
    if(msg && msg[1] === 'help') {
      sendMessage(steamID, 'I am a case dispenser, you can get 10 cases free. After that you have to pay with cheap skins\n' +
      'Please use the name of the case provided here when requesting:\n' +
      'chroma, chroma2, falchion, breakout, phoenix, vanguard'
      'Commands:\n' +
      '\tr OR request <amount> <case>: sends a trade offer for that number of cases. e.g. request 10 falchion\n' +
      '\ti OR inventory: returns how many cases I have');
    } else if (msg && (msg[1] === 'inventory' || msg[1] === 'i')) {

    } else if (msg) {
      sendMessage(steamID, 'Sorry, that command is not recognized.');
    } else {
      sendMessage(steamID, 'Sorry, please enter a command. !help for list of commands');
    }
  }
});

client.on('tradeProposed', function(tradeID, steamID) {
  if (inTrade) {
    client.respondToTrade(tradeID, false);
    sendMessage(steamID, 'Sorry, I am currently in a exchange with someone else.');
  } else {
    client.respondToTrade(tradeID, true);
    logger.info('[' + steamID + '] Accepted trade request');
  }
});

