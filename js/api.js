import { RestAPI } from "@aws-amplify/api-rest";
import Amplify from "@aws-amplify/core";

import awsconfig from "../aws-exports";
import { currentUser } from "./auth";

Amplify.configure(awsconfig);

class ApiError extends Error {}
class UnknownError extends Error {
  constructor() {
    super("unexpected error ¯\\_(ツ)_/¯");
  }
}

const apiName = "miguelito";

export async function shorten(url, customPath) {
  const withCustomPath = !customPath.trim().isEmpty();
  const body = { url };
  if (withCustomPath) {
    body.custom_path = customPath;
  }

  return RestAPI.post(
    apiName,
    withCustomPath ? "/shorten-custom" : "/shorten",
    await requestOptionsWithBody(body)
  )
    .then((data) => data.path)
    .then(buildUrl)
    .catch(handleError);
}

export async function list() {
  return RestAPI.get(apiName, "/urls", await requestOptions())
    .then((data) => data.urls)
    .then((urls) => urls.map(addShortenedUrl))
    .catch(handleError);
}

function addShortenedUrl(url) {
  return { ...url, shortened_url: buildUrl(url.path) };
}

async function requestOptionsWithBody(body) {
  return { ...(await requestOptions()), body };
}

async function requestOptions() {
  return {
    headers: {
      ...(await authHeader()),
    },
  };
}

function authHeader() {
  return currentUser()
    .then((user) => ({
      Authorization: `Bearer ${user.jwtToken}`,
    }))
    .catch(() => {
      // ignore no current user
    });
}

function buildUrl(path) {
  return `${window.location.host}/${path}`;
}

function handleError(error) {
  console.error(error);
  const { response } = error;
  if (response && response.status < 500) {
    throw new ApiError(response.data.message);
  } else {
    throw new UnknownError();
  }
}
