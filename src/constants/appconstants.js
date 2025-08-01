//we receive the trigger name in the "type" url param in the subscribe endpoint, so that we know which trigger has been subscribed from pronnel.
const TRIGGER_NAME = { BRANCH_CREATED: "branch_created", BRANCH_DELETED: "branch_deleted", COMMIT_CREATED: "commit_created", PULL_REQ_CREATED: "pull_request_created", PULL_REQ_MERGED: "pull_request_merged", PULL_REQ_COMMENTED:"pull_req_commented" };

const BASE_URL = 'https://github.com/';
const APP_URLS = {
    BASE_URL: BASE_URL,
    SYSTEM_INFO: `${BASE_URL}/info`,
    ACCESS_TOKEN: `${BASE_URL}/login/oauth/access_token`,
    AUTHORIZE: `${BASE_URL}/login/oauth/authorize`
}
const APP_HOST_URL=process.env.APP_HOST_URL;
const REDIRECT_URI = `${APP_HOST_URL}/callback`;

//This is the sample response that will be sent to the Pronnel automation trigger's webhook
const BRANCH_CREATED_SAMPLE = `{
	"ref": "25SepTest2",
	"ref_type": "branch",
	"master_branch": "main",
	"description": null,
	"pusher_type": "user",
	"repository": {
		"id": 861643244,
		"node_id": "R_kgDOM1uh7A",
		"name": "AppTesting",
		"full_name": "MohitAthmin/AppTesting",
		"private": true,
		"owner": {
			"login": "MohitAthmin",
			"id": 181548365,
			"node_id": "U_kgDOCtI1TQ",
			"avatar_url": "https://avatars.githubusercontent.com/u/181548365?v=4",
			"gravatar_id": "",
			"url": "https://api.github.com/users/MohitAthmin",
			"html_url": "https://github.com/MohitAthmin",
			"followers_url": "https://api.github.com/users/MohitAthmin/followers",
			"following_url": "https://api.github.com/users/MohitAthmin/following{/other_user}",
			"gists_url": "https://api.github.com/users/MohitAthmin/gists{/gist_id}",
			"starred_url": "https://api.github.com/users/MohitAthmin/starred{/owner}{/repo}",
			"subscriptions_url": "https://api.github.com/users/MohitAthmin/subscriptions",
			"organizations_url": "https://api.github.com/users/MohitAthmin/orgs",
			"repos_url": "https://api.github.com/users/MohitAthmin/repos",
			"events_url": "https://api.github.com/users/MohitAthmin/events{/privacy}",
			"received_events_url": "https://api.github.com/users/MohitAthmin/received_events",
			"type": "User",
			"site_admin": false
		}
	},
	"sender": {
		"login": "MohitAthmin",
		"id": 181548365,
		"node_id": "U_kgDOCtI1TQ",
		"avatar_url": "https://avatars.githubusercontent.com/u/181548365?v=4",
		"gravatar_id": "",
		"url": "https://api.github.com/users/MohitAthmin",
		"html_url": "https://github.com/MohitAthmin",
		"followers_url": "https://api.github.com/users/MohitAthmin/followers",
		"following_url": "https://api.github.com/users/MohitAthmin/following{/other_user}",
		"gists_url": "https://api.github.com/users/MohitAthmin/gists{/gist_id}",
		"starred_url": "https://api.github.com/users/MohitAthmin/starred{/owner}{/repo}",
		"subscriptions_url": "https://api.github.com/users/MohitAthmin/subscriptions",
		"organizations_url": "https://api.github.com/users/MohitAthmin/orgs",
		"repos_url": "https://api.github.com/users/MohitAthmin/repos",
		"events_url": "https://api.github.com/users/MohitAthmin/events{/privacy}",
		"received_events_url": "https://api.github.com/users/MohitAthmin/received_events",
		"type": "User",
		"site_admin": false
	},
	"installation": {
		"id": 55173673,
		"node_id": "MDIzOkludGVncmF0aW9uSW5zdGFsbGF0aW9uNTUxNzM2NzM="
	}
}`

module.exports = {
    TRIGGER_NAME,
    APP_URLS,
    REDIRECT_URI
}
