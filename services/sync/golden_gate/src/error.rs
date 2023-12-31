/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use std::{error, fmt, result, str::Utf8Error};

use nserror::{nsresult, NS_ERROR_INVALID_ARG, NS_ERROR_UNEXPECTED};
use serde_json::Error as JsonError;

/// A specialized `Result` type for Golden Gate.
pub type Result<T> = result::Result<T, Error>;

/// The error type for Golden Gate errors.
#[derive(Debug)]
pub enum Error {
    /// A wrapped XPCOM error.
    Nsresult(nsresult),

    /// A ferry didn't run on the background task queue.
    DidNotRun(&'static str),

    /// A string contains invalid UTF-8 or JSON.
    MalformedString(Box<dyn error::Error + Send + Sync + 'static>),
}

impl error::Error for Error {
    fn source(&self) -> Option<&(dyn error::Error + 'static)> {
        match self {
            Error::MalformedString(error) => Some(error.as_ref()),
            _ => None,
        }
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Error::Nsresult(result) => write!(f, "Operation failed with {}", result.error_name()),
            Error::DidNotRun(what) => write!(f, "Failed to run `{what}` on background thread"),
            Error::MalformedString(error) => error.fmt(f),
        }
    }
}

impl From<nsresult> for Error {
    fn from(result: nsresult) -> Error {
        Error::Nsresult(result)
    }
}

impl From<Utf8Error> for Error {
    fn from(error: Utf8Error) -> Error {
        Error::MalformedString(error.into())
    }
}

impl From<JsonError> for Error {
    fn from(error: JsonError) -> Error {
        Error::MalformedString(error.into())
    }
}

impl From<Error> for nsresult {
    fn from(error: Error) -> nsresult {
        match error {
            Error::DidNotRun(_) => NS_ERROR_UNEXPECTED,
            Error::Nsresult(result) => result,
            Error::MalformedString(_) => NS_ERROR_INVALID_ARG,
        }
    }
}
