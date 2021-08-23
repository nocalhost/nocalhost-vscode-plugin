# Change Log

## Version 0.5.0 (16 Aug 2021)

#### New Features

- Add cluster status
- Add guidance of `No cluster information`

#### Refactor & Improvement

- Optimize `syncService` icon
- Optimize access to apps and increase opening speed
- Optimize plugin descriptions

#### Bug Fixes

- Fixed the trust issue when installing ssh for the first time
- Fixed the notification issue of `Open Project` is not associated with a target
- Fixed `run` command
- Fixed the config issue of `StatefulSet`

## Version 0.4.19 (2 Aug 2021)

### New Features

- Add icon for syncService
- Add status for cluster
- Add guide information when there is no cluster

### Bug Fixes

- Fixed the ssh trust problem when installing application for the first time
- Fixed the run command
- Fixed failing to get config of statefulset
- Fixed status icon of statefulset displaying incorrectly

### Optimization

- Improve the speed of opening application
- Add prompt when `Open Project` is not associated with a target directory
- Unify description of menu and page

## Version 0.4.18 (23 Jul 2021)

### New Features

- Add 'Install Quick Demo'
- Add nhctl apiServer upgrade detection configuration

### Bug Fixes

- Fixed the `reset` will use the previous DevSpace issue
- Fixed Kubernetes configuration file is group-readable issue
- Fixed the long waiting issue of showing application list
- Fixed the high CPU and memory usage caused by multi nhctl execution
- Fixed the issue that unable to install application when has default.application option
- Fixed the "Twice container selection when enter DevMode for Deployments" issue
- Fixed the `run` feature issue

### Optimization

- Optimize the status display when file sync in outOfSync

## Version 0.4.14 (16 Jul 2021)

### New Features

- Add `open project` feature in DevMode: You can now go back to the DevMode window by one click.
- Now supports to detect Nocalhost Server version detection

### Bug Fixes

- Fixed job status display issue
- Fixed the issue of repeated obtaining by `config`
- Fixed the parameter problem of `install app config`

### Optimization

- Optimize the automatic closing pop window when installing the application (Now need to close by ESC)
