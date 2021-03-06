import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get } from '@ember/object';
import Preload from 'ui/mixins/preload';
import { reject, all as PromiseAll } from 'rsvp';

export default Route.extend(Preload, {
  scope: service(),
  globalStore: service(),
  clusterStore: service(),

  actions: {
    becameReady() {
      get(this,'clusterStore').reset();
      this.refresh();
    },
  },

  model(params, transition) {
    return get(this, 'globalStore').find('cluster', params.cluster_id).then((cluster) => {
      return get(this, 'scope').startSwitchToCluster(cluster).then(() => {
        if ( get(cluster,'isReady') ) {
          return this.loadSchemas('clusterStore').then(() => {
            return PromiseAll([
              this.preload('namespace','clusterStore'),
              this.preload('storageClass','clusterStore'),
              this.preload('persistentVolume','clusterStore'),
            ]).then(() => {
              return cluster;
            });
          });
        } else {
          return cluster;
        }
      }).catch((err) => {
        // @TODO-2.0 right now the API can't return schemas for a not-active cluster
        if ( err.status === 404 ) {
          return cluster;
        } else {
          return reject(err);
        }
      });
    }).catch((err) => {
      return this.loadingError(err, transition);
    });
  },

  setupController(controller, model) {
    this._super(...arguments);
    get(this, 'scope').finishSwitchToCluster(model);
  },
});
