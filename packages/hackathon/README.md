# WIP Hackathon extension

This extension uses the `@looker/wholly-sheet` package (currently only available in this repository) for CRUDF operations on a GSheet.

The only complication is that modifications of a GSheet cannot be done with only an API key, so you must use a service account or OAuth.

But fear not! During development, you can use the `WhollySheet` unit tests to log an auth token to the console, then use that token to initialize the SheetSDK for this extension.
 
Run either [SheetSDK.spec.ts](../wholly-sheet/src/SheetSDK.spec.ts) or [WhollySheet.spec.ts](../wholly-sheet/src/WhollySheet.spec.ts) to have a valid auth token logged to the console.

Use that token to initialize the SheetSDK for your extension development pleasure as shown at the bottom of [testUtils.ts](../wholly-sheet/src/testUtils/testUtils.ts)

## Configuration

To configure your GSheet, see the instructions in the [WhollySheet readme](../wholly-sheet/README.md#getting-your-gsheet-credentials)

### Hackathon extension

The Hackathon manifest should have:

```lookml
project_name: "ext-hack"

application: ext-hack {
  label: "Hackathon"
  url: "https://localhost:8080/dist/bundle.js"
  entitlements: {
    local_storage: yes
    navigation: yes
    new_window: yes
    use_form_submit: yes
    use_embeds: yes
  }
}

```

Remember to add a model to the project that has any valid connection.