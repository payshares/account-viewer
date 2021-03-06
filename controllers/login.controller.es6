import {Intent} from "interstellar-core";
import {Controller, Inject} from "interstellar-core";
import {Keypair} from 'stellar-sdk';
import {Alert, AlertGroup} from 'interstellar-ui-messages';
import StellarLedger from 'stellar-ledger-api';

@Controller("LoginController")
@Inject("$scope", "interstellar-core.Config", "interstellar-core.IntentBroadcast", "interstellar-sessions.Sessions", "interstellar-ui-messages.Alerts")
export default class LoginController {
  constructor($scope, Config, IntentBroadcast, Sessions, Alerts) {
    this.$scope = $scope;
    this.Config = Config;
    this.IntentBroadcast = IntentBroadcast;
    this.Sessions = Sessions;

    if (this.Sessions.hasDefault()) {
      this.broadcastShowDashboardIntent();
    }

    this.alertGroup = new AlertGroup();
    this.alertGroup.registerUpdateListener(alerts => {
      this.alerts = alerts;
    });

    this.ledgerAlertGroup = new AlertGroup();
    this.ledgerAlertGroup.registerUpdateListener(alerts => {
      this.ledgerAlerts = alerts;
    });
    this.bip32Path = "44'/148'/0'";
    this.connectLedger();

    this.infoImage = require('../images/info.png');
    this.showInfo = false;

    Alerts.registerGroup(this.alertGroup);
  }

  broadcastShowDashboardIntent() {
    this.IntentBroadcast.sendBroadcast(
      new Intent(
        Intent.TYPES.SHOW_DASHBOARD
      )
    );
  }

  toggleInfo() {
    this.showInfo = !this.showInfo;
  }

  connectLedger() {
    this.ledgerStatus = 'Not connected';
    new StellarLedger.Api(new StellarLedger.comm(Number.MAX_VALUE))
      .connect(() => {
        this.ledgerStatus = 'Connected';
        this.$scope.$apply();
      }, () => {
        this.ledgerStatus = 'Error: ' + err;
        this.$scope.$apply();
      });
  }

  proceedWithLedger() {
    try {
      new StellarLedger.Api(new StellarLedger.comm(20)).getPublicKey_async(this.bip32Path).then((result) => {
        let permanent = this.Config.get("permanentSession");
        let data = { useLedger: true, bip32Path: this.bip32Path };
        let address = result['publicKey'];
        this.Sessions.createDefault({address, data, permanent})
          .then(() => this.broadcastShowDashboardIntent());
      }).catch((err) => {
        let alert = new Alert({
          title: 'Failed to connect',
          text: err,
          type: Alert.TYPES.ERROR
        });
        this.ledgerAlertGroup.show(alert);
      });
    } catch (err) {
      let alert = new Alert({
        title: 'Failed to connect',
        text: err,
        type: Alert.TYPES.ERROR
      });
      this.ledgerAlertGroup.show(alert);
    }
  }

  generate() {
    let keypair = Keypair.random();
    this.newKeypair = {
      publicKey: keypair.accountId(),
      secretKey: keypair.seed()
    };
  }

  submit() {
    this.alertGroup.clear();
    this.processing = true;
    let secret = this.secret;
    try {
      let keypair = Keypair.fromSeed(secret);
      let address = keypair.accountId();
      let permanent = this.Config.get("permanentSession");
      this.Sessions.createDefault({address, secret, permanent})
        .then(() => {
          this.broadcastShowDashboardIntent();
        });
    } catch(e) {
      this.processing = false;
      let alert = new Alert({
        title: 'Invalid secret key',
        text: 'Secret keys are uppercase and begin with the letter "S."',
        type: Alert.TYPES.ERROR
      });
      this.alertGroup.show(alert);
    }
  }
}
