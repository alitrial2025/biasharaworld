# Deployment source

Production must be built from the current development branch, not the old cloud workspace snapshot. The restored baseline is `feat/live-business-data` commit `14a0f7d123a4672d5de0ce1ae329c5ca453085e3`, which includes the demo cleanup, business validation, visible appearance controls, persisted visitor/account themes, and Android release signing safeguards.

The auth layout changes are applied on top of that baseline. They retain account return paths, confirmation/recovery handling, business-loading recovery, and theme controls. The new photo/gradient form surfaces use theme variables. No older debug APK is published by this deployment.

Deploy from this checkout with an explicit source revision:

```sh
biashara_revision=$(git rev-parse HEAD)
bash tools/backend-cli.sh vercel deploy --prod --yes --build-env "APP_SOURCE_REVISION=$biashara_revision" --meta "sourceCommit=$biashara_revision"
```

Verify the `X-Biashara-Source` response header against that full commit hash, as well as the public theme toggle, account workflows and authenticated API. A successful deployment alone does not establish that the intended source was uploaded.
