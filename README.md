# Cloudflare worker / Formulator

Cloudflare worker which handles form submissions.

## Configuration

Configuration is done by setting the following environment variables:

- `REQUEST_PATH`
  - Default value: `/`
  - Must contain an initial `/`
  - Used to set the property of the URL containing an initial '/' followed by the path of the URL not including the query string or fragment (or the empty string if there is no path), full URL will look like this: https://{worker_domain}{request_path}
  - Example value: `/submit/`
  - Example for full URL when `REQUEST_PATH` is set to `/submit/`: https://myworker.mysubdomain.workers.dev/submit/

- `REQUEST_METHOD`
  - Default value: `POST`
  - Possible values: `POST`, `GET`
  - Used to set the http request method used when sending form data

- `HONEYPOT_FIELD`
  - Optional
  - Used as a anti-bot check, should be hidden on the frontend and always have an empty value (if value is not empty, then the form has most likely been filled in by a bot)
  - Example value: `no-spam-pls`

- `FORM_FIELDS`
  - Optional
  - Must be defined as a comma separated list of fields
  - Used to define which form fields sent in the request should be considered, if not set then all of the fields will be considered
  - Example value: `name,email,message`

- `REQUIRED_FIELDS`
  - Optional
  - Must be defined as a comma separated list of fields
  - Used to define which form fields are required to be sent in the request, if not set then none of the fields are required

- `EMAIL_FIELDS`
  - Optional
  - Must be defined as a comma separated list of fields
  - Used to define which form fields are required to be valid email addresses

- `DISCORD_WEBHOOK_URL`
  - Optional
  - Used to integrate with Discord, sends form data to the defined webhook
  - Learn more [here](https://support.discord.com/hc/en-us/articles/228383668)