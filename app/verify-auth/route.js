import Route from '@ember/routing/route';
import RSVP from 'rsvp';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';
import C from 'shared/utils/constants';
import VerifyAuth from 'ui/mixins/verify-auth';

export default Route.extend(VerifyAuth, {
  github         : service(),

  model(params/* , transition */) {
    if (window.opener && !get(params, 'login')) {
      let openerController = window.opener.lc('security.authentication.github');
      let openerStore      = get(openerController, 'globalStore');
      let qp               = get(params, 'config') || get(params, 'authProvider');
      let type             = `${qp}Config`;
      let config           = openerStore.getById(type, qp);
      let gh               = get(this, 'github');
      let stateMsg         = 'Authorization state did not match, please try again.';

      if (get(params, 'config') === 'github') {

        return gh.testConfig(config).then((resp) => {
          gh.authorize(resp, openerController.get('github.state'));
        }).catch(err => {
          this.send('gotError', err);
        });

      }

      if (get(params, 'code')) {
        // TODO see if session.githubState works here
        if (openerController.get('github').stateMatches(get(params, 'state'))) {
          reply(params.error_description, params.code);
        } else {
          reply(stateMsg);
        }
      }

    }

    if (get(params, 'code') && get(params, 'login')) {
      if (get(this, 'github').stateMatches(get(params, 'state'))) {
        let ghProvider = get(this, 'access.providers').findBy('id', 'github');
        return ghProvider.doAction('login', {
          code: get(params, 'code'),
          responseType: 'cookie',
          description: C.SESSION.DESCRIPTION,
          ttl: C.SESSION.TTL,
        }).then(() => {
          return this.transitionTo('authenticated');
        });
      }

    }

    function reply(err,code) {
      try {
        window.opener.window.onGithubTest(err,code);
        setTimeout(function() {
          window.close();
        },250);
        return new RSVP.promise();
      } catch(e) {
        window.close();
      }
    }
  }

});
