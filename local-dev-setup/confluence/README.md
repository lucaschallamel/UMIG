# Custom Confluence Image for UMIG

This directory contains the necessary files to build a custom Confluence image with ScriptRunner pre-installed.

## Pre-requisites

Before building the image, you must manually download the ScriptRunner for Confluence plugin.

1.  **Go to the Atlassian Marketplace:** [ScriptRunner for Confluence](https://marketplace.atlassian.com/apps/1215215/scriptrunner-for-confluence?hosting=server&tab=versions)
2.  **Select a compatible version:** Find a version of ScriptRunner that is compatible with Confluence `7.19.8`. Check the version history for compatibility details.
3.  **Download the `.jar` file.**
4.  **Place the file in this directory:** Move the downloaded `scriptrunner-for-confluence-x.y.z.jar` file into this `local-dev-setup/confluence/` directory. The `Containerfile` will copy it into the image during the build process.