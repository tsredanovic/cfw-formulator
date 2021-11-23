/*
 * CONFIGURATION
 */
const config = {};

(typeof REQUEST_PATH === 'undefined') ? config.requestPath = "/" : config.requestPath = REQUEST_PATH;
(typeof REQUEST_METHOD === 'undefined') ? config.requestMethod = "POST" : config.requestMethod = REQUEST_METHOD;

(typeof HONEYPOT_FIELD === 'undefined') ? config.honeypotField = undefined : config.honeypotField = HONEYPOT_FIELD;

(typeof FORM_FIELDS === 'undefined') ? config.formFields = [] : config.formFields = FORM_FIELDS.split(",");
(typeof REQUIRED_FIELDS === 'undefined') ? config.requiredFields = [] : config.requiredFields = REQUIRED_FIELDS.split(",");
(typeof EMAIL_FIELDS === 'undefined') ? config.emailFields = [] : config.emailFields = EMAIL_FIELDS.split(",");

(typeof DISCORD_WEBHOOK_URL === 'undefined') ? config.discordWebhookURL = undefined : config.discordWebhookURL = DISCORD_WEBHOOK_URL;

(typeof SLACK_WEBHOOK_URL === 'undefined') ? config.slackWebhookURL = undefined : config.slackWebhookURL = SLACK_WEBHOOK_URL;

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
    // Filter out empty values
    const cleanedFormData = {};
    for (const [formField, formFieldValue] of Object.entries(formData)) {
        if (formFieldValue) {
            cleanedFormData[formField] = formFieldValue;
        }
    }

    // formFields not defined in config
    if (!config.formFields || !config.formFields.length) {
        return cleanedFormData;
    }

    // Extract only formFields from cleanedFormData
    const filteredFormData = {};
    for (let i = 0; i < config.formFields.length; i++) {
        let formField = config.formFields[i];
        if (formField in cleanedFormData) {
            filteredFormData[formField] = cleanedFormData[formField];
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
    for (let i = 0; i < config.requiredFields.length; i++) {
        let formField = config.requiredFields[i];
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
 * INTEGRATIONS
 */
// Discord integration
async function integrateDiscord(formData) {
    if (!config.discordWebhookURL) {
        return;
    }

    const body = { embeds: [{ fields: [] }] }
    for (const [formField, formFieldValue] of Object.entries(formData)) {
        body["embeds"][0]["fields"].push({ name: formField, value: formFieldValue });
    }
    const request = {
        body: JSON.stringify(body),
        method: "POST",
        headers: {
            "content-type": "application/json;charset=UTF-8",
        },
    };
    const response = await fetch(config.discordWebhookURL, request);
};

// Slack integration
async function integrateSlack(formData) {
    if (!config.slackWebhookURL) {
        return;
    }

    const body = { blocks: [{ type: "section", fields: [] }] }
    for (const [formField, formFieldValue] of Object.entries(formData)) {
        body["blocks"][0]["fields"].push({ type: "mrkdwn", text: `*${formField}*\n${formFieldValue}` });
    }
    const request = {
        body: JSON.stringify(body),
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
    };
    const response = await fetch(config.slackWebhookURL, request);
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

    // Integrate discord
    await integrateDiscord(filteredFormData);

    // Integrate slack
    await integrateSlack(filteredFormData);

    // Success
    return JSONResponse({ code: "form_submitted", "detail": "Form submitted." });
};