# lamba
*A tiny development web server that wraps over AWS lambda handlers*

If you're tired of how slow `sam local start-api` is for local development, you can use **lamba** to serve local endpoints corresponding to the AWS SAM lambda handlers in your codebase. Thrown together in an afternoon -- still very much in development.

# Usage
`lamba [path_to_config=./lamba.json]`

# Configuration
Configuration happens through a `lamba.json` file. If one isn't passed as an argument, tries to default to a `launch.json` file in the current folder.

**Example structure**
```
{
  "port": 6987,
  "routes": [
      {
        "path": "/local_path_starting_with_slash",
        "endpoint": "/endpoint_starting_with_slash/:optional_path_param"
      },
    ...
  ]
  "env": [
    "key": "value",
    ...
  ]
}
```

# License
Licensed under the MIT License. Made by Marko Calasan, 2023.
