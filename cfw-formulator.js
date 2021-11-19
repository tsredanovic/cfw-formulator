/*
* CONFIGURATION
*/
const config = {
  requestPath: "/submit/",
  requestMethod: "GET",

  honeypotField: "no-spam-pls",

  formFields: ["email", "name", "message"],
  requiredFormFields: ["email", "message"],
  emailFields: ["email"]
};


/*
* HELPERS
*/
// Helper function to return JSON response
const JSONResponse = (message, status = 200) => {
  let headers = {
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    },

    status: status
  };

  return new Response(JSON.stringify(message), headers);
};

// Helper function to get data from various types of form submit
async function getFormData(request) {
  const contentType = request.headers.get("content-type") || ""

  // Data is submit as JSON (application/json)
  if (contentType.includes("application/json")) {
    return await request.json()
  }
  // Data is submit as form (multipart/form-data, application/x-www-form-urlencoded)
  else if (contentType.includes("form")) {
    const formData = await request.formData()
    const body = {}
    for (const entry of formData.entries()) {
      body[entry[0]] = entry[1]
    }
    return body
  }
  // Data is submit as Query Params, this is default
  else {
    const url = new URL(request.url);
    const queryParams = {}
    for (const entry of url.searchParams.entries()) {
      queryParams[entry[0]] = entry[1]
    }
    return queryParams
  }
};

// Helper function to filter form data with only formFields
async function filterFormData(formData) {
  // formFields not defined in config
  if (!config.formFields) {
    return formData;
  }

  // Filter formData
  const filteredFormData = {};
  for (let i = 0; i < config.formFields.length; i++) {
    let formField = config.formFields[i];
    if (formField in formData) {
      filteredFormData[formField] = formData[formField];
    }
  }
  return filteredFormData;
};

/*
* VALIDATORS
*/
// Honeypot field validator
async function validateHoneypotField(formData) {
  // honeypotField not defined in config
  if (!config.honeypotField) {
    return [];
  }

  // Honeypot field is valid
  if (formData[config.honeypotField] === "") {
    return [];
  }
  // Honeypot field is invalid
  return [{ code: "invalid_honeypot_field", detail: "Honeypot field is invalid." }]
};

// Required form fields validator
async function validateRequiredFields(formData) {
  let errors = [];
  for (let i = 0; i < config.requiredFormFields.length; i++) {
    let formField = config.requiredFormFields[i];
    if (!formData[formField]) {
      errors.push({ code: "missing_required_field", field: formField, detail: `Field ${formField} is required.` });
    }
  }
  return errors;
};

// Email form fields validator
async function validateEmailFields(formData) {
  let email_regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  let errors = [];
  for (let i = 0; i < config.emailFields.length; i++) {
    let emailField = config.emailFields[i];
    if (!email_regex.test(formData[emailField])) {
      errors.push({ code: "invalid_email", field: emailField, value: formData[emailField], detail: "Invalid email address." });
    }
  }
  return errors;
};


/*
* EVENT LISTENER
*/
addEventListener("fetch", (event) => {
  event.respondWith(
    handleRequest(event.request).catch(
      (err) => new Response(err.stack, { status: 500 })
    )
  );
});


/*
* REQUEST HANDLER
*/
async function handleRequest(request) {
  // Options
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }
  // Request
  return handleSubmitRequest(request)
};


/*
* OPTIONS HANDLER
*/
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function handleOptions(request) {
  if (
    request.headers.get("Origin") !== null &&
    request.headers.get("Access-Control-Request-Method") !== null &&
    request.headers.get("Access-Control-Request-Headers") !== null
  ) {
    // Handle CORS pre-flight request.
    return new Response(null, {
      headers: corsHeaders
    });
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: "GET, HEAD, POST, OPTIONS"
      }
    });
  }
};


/*
* SUBMIT REQUEST HANDLER
*/
async function handleSubmitRequest(request) {
  // Validate request path
  const pathname = new URL(request.url)["pathname"];
  if (pathname !== config.requestPath) {
    return JSONResponse({ code: "path_not_found", detail: "Path not found." }, status = 404);
  }

  // Validate request method
  if (request.method !== config.requestMethod) {
    return JSONResponse({ code: "method_not_allowed", method: request.method, detail: `Method ${request.method} not allowed.` }, status = 400);
  }

  const formData = await getFormData(request);
  var errors = [];

  // Validate honeypot field
  errors = await validateHoneypotField(formData)
  if (errors && errors.length) {
    return JSONResponse({ code: "invalid_request", detail: "Invalid request." }, status = 400);
  }

  // Filter form data
  const filteredFormData = await filterFormData(formData);

  // Validate required fields
  errors = await validateRequiredFields(filteredFormData)
  if (errors && errors.length) {
    return JSONResponse({ code: "missing_required_fields", detail: "Some required fields are missing.", errors: errors }, status = 400);
  }

  // Validate email fields
  errors = await validateEmailFields(filteredFormData)
  if (errors && errors.length) {
    return JSONResponse({ code: "invalid_email_fields", detail: "Some email fields are invalid.", errors: errors }, status = 400);
  }

  // Success
  return JSONResponse({ code: "submited", "detail": "Form submited."});
};