///<reference path="../../../headers/common.d.ts" />

import _ from 'lodash';
import moment from 'moment';
import angular from 'angular';

export class DashNavCtrl {

  /** @ngInject */
  constructor($scope, $rootScope, alertSrv, $location, playlistSrv, backendSrv, $timeout) {

    $scope.init = function() {
      $scope.onAppEvent('save-dashboard', $scope.saveDashboard);
      $scope.onAppEvent('delete-dashboard', $scope.deleteDashboard);

      $scope.showSettingsMenu = $scope.dashboardMeta.canEdit || $scope.contextSrv.isEditor;

      if ($scope.dashboardMeta.isSnapshot) {
        $scope.showSettingsMenu = false;
        var meta = $scope.dashboardMeta;
        $scope.titleTooltip = 'Created: &nbsp;' + moment(meta.created).calendar();
        if (meta.expires) {
          $scope.titleTooltip += '<br>Expires: &nbsp;' + moment(meta.expires).fromNow() + '<br>';
        }
      }
    };

    $scope.openEditView = function(editview) {
      var search = _.extend($location.search(), {editview: editview});
      $location.search(search);
    };

    $scope.starDashboard = function() {
      if ($scope.dashboardMeta.isStarred) {
        backendSrv.delete('/api/user/stars/dashboard/' + $scope.dashboard.id).then(function() {
          $scope.dashboardMeta.isStarred = false;
        });
      } else {
        backendSrv.post('/api/user/stars/dashboard/' + $scope.dashboard.id).then(function() {
          $scope.dashboardMeta.isStarred = true;
        });
      }
    };

    $scope.shareDashboard = function() {
      $scope.appEvent('show-modal', {
        src: './app/features/dashboard/partials/shareModal.html',
        scope: $scope.$new(),
      });
    };

    $scope.openSearch = function() {
      $scope.appEvent('show-dash-search');
    };

    $scope.hideTooltip = function(evt) {
      angular.element(evt.currentTarget).tooltip('hide');
      $scope.appEvent('hide-dash-search');
    };

    $scope.makeEditable = function() {
      $scope.dashboard.editable = true;

      var clone = $scope.dashboard.getSaveModelClone();

      backendSrv.saveDashboard(clone, {overwrite: false}).then(function(data) {
        $scope.dashboard.version = data.version;
        $scope.appEvent('dashboard-saved', $scope.dashboard);
        $scope.appEvent('alert-success', ['Dashboard saved', 'Saved as ' + clone.title]);

        // force refresh whole page
        window.location.href = window.location.href;
      }, $scope.handleSaveDashError);
    };

    $scope.saveDashboard = function(options) {
      if ($scope.dashboardMeta.canSave === false) {
        return;
      }

      var clone = $scope.dashboard.getSaveModelClone();

      backendSrv.saveDashboard(clone, options).then(function(data) {
        $scope.dashboard.version = data.version;
        $scope.appEvent('dashboard-saved', $scope.dashboard);

        var dashboardUrl = '/dashboard/db/' + data.slug;

        if (dashboardUrl !== $location.path()) {
          $location.url(dashboardUrl);
        }

        $scope.appEvent('alert-success', ['Dashboard saved', 'Saved as ' + clone.title]);
      }, $scope.handleSaveDashError);
    };

    $scope.handleSaveDashError = function(err) {
      if (err.data && err.data.status === "version-mismatch") {
        err.isHandled = true;

        $scope.appEvent('confirm-modal', {
          title: 'Someone else has updated this dashboard!',
          text: "Would you still like to save this dashboard?",
          yesText: "Save & Overwrite",
          icon: "fa-warning",
          onConfirm: function() {
            $scope.saveDashboard({overwrite: true});
          }
        });
      }

      if (err.data && err.data.status === "name-exists") {
        err.isHandled = true;

        $scope.appEvent('confirm-modal', {
          title: 'Another dashboard with the same name exists',
          text: "Would you still like to save this dashboard?",
          yesText: "Save & Overwrite",
          icon: "fa-warning",
          onConfirm: function() {
            $scope.saveDashboard({overwrite: true});
          }
        });
      }
    };

    $scope.deleteDashboard = function() {
      $scope.appEvent('confirm-modal', {
        title: 'Do you want to delete dashboard ' + $scope.dashboard.title + '?',
        icon: 'fa-trash',
        yesText: 'Delete',
        onConfirm: function() {
          $scope.deleteDashboardConfirmed();
        }
      });
    };

    $scope.deleteDashboardConfirmed = function() {
      backendSrv.delete('/api/dashboards/db/' + $scope.dashboardMeta.slug).then(function() {
        $scope.appEvent('alert-success', ['Dashboard Deleted', $scope.dashboard.title + ' has been deleted']);
        $location.url('/');
      });
    };

    $scope.saveDashboardAs = function() {
      var newScope = $rootScope.$new();
      newScope.clone = $scope.dashboard.getSaveModelClone();
      newScope.clone.editable = true;
      newScope.clone.hideControls = false;

      $scope.appEvent('show-modal', {
        src: './app/features/dashboard/partials/saveDashboardAs.html',
        scope: newScope,
      });
    };

    $scope.exportDashboard = function() {
      var clone = $scope.dashboard.getSaveModelClone();
      var blob = new Blob([angular.toJson(clone, true)], { type: "application/json;charset=utf-8" });
      var wnd: any = window;
      wnd.saveAs(blob, $scope.dashboard.title + '-' + new Date().getTime());
    };

    $scope.snapshot = function() {
      $scope.dashboard.snapshot = true;
      $rootScope.$broadcast('refresh');

      $timeout(function() {
        $scope.exportDashboard();
        $scope.dashboard.snapshot = false;
        $scope.appEvent('dashboard-snapshot-cleanup');
      }, 1000);

    };

    $scope.editJson = function() {
      var clone = $scope.dashboard.getSaveModelClone();
      $scope.appEvent('show-json-editor', { object: clone });
    };

    $scope.stopPlaylist = function() {
      playlistSrv.stop(1);
    };

    $scope.init();
  }
}

export function dashNavDirective() {
  return {
    restrict: 'E',
    templateUrl: 'app/features/dashboard/dashnav/dashnav.html',
    controller: DashNavCtrl,
    transclude: true,
  };
}

angular.module('grafana.directives').directive('dashnav', dashNavDirective);
