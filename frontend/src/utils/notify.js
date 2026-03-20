import { toast } from "react-toastify";

export function getErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (!err) return fallback;
  const msg =
    err.response?.data?.message ||
    err.response?.data?.error ||
    err.message ||
    fallback;
  return typeof msg === "string" ? msg : fallback;
}

export function notifySuccess(message, opts) {
  toast.success(message, opts);
}

export function notifyInfo(message, opts) {
  toast.info(message, opts);
}

export function notifyWarning(message, opts) {
  toast.warning(message, opts);
}

export function notifyError(message, opts) {
  toast.error(message, opts);
}

export function notifyApiError(err, fallback) {
  notifyError(getErrorMessage(err, fallback));
}

