/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsCopyMessageStreamListener.h"
#include "nsIMsgMailNewsUrl.h"
#include "nsIMsgImapMailFolder.h"
#include "nsIChannel.h"
#include "nsIURI.h"

NS_IMPL_ISUPPORTS(nsCopyMessageStreamListener, nsIStreamListener,
                  nsIRequestObserver, nsICopyMessageStreamListener)

nsCopyMessageStreamListener::nsCopyMessageStreamListener() {}

nsCopyMessageStreamListener::~nsCopyMessageStreamListener() {
  // All member variables are nsCOMPtr's.
}

NS_IMETHODIMP nsCopyMessageStreamListener::Init(
    nsICopyMessageListener* destination) {
  mDestination = destination;
  return NS_OK;
}

NS_IMETHODIMP nsCopyMessageStreamListener::StartMessage() {
  if (mDestination) {
    return mDestination->StartMessage();
  }
  return NS_OK;
}

NS_IMETHODIMP nsCopyMessageStreamListener::EndMessage(nsMsgKey key) {
  if (mDestination) {
    return mDestination->EndMessage(key);
  }
  return NS_OK;
}

NS_IMETHODIMP nsCopyMessageStreamListener::OnDataAvailable(
    nsIRequest* /* request */, nsIInputStream* aIStream, uint64_t sourceOffset,
    uint32_t aLength) {
  return mDestination->CopyData(aIStream, aLength);
}

NS_IMETHODIMP nsCopyMessageStreamListener::OnStartRequest(nsIRequest* request) {
  nsresult rv = NS_OK;
  nsCOMPtr<nsIURI> uri;

  // We know the request is an nsIChannel we can get a URI from, but this is
  // probably bad form. See Bug 1528662.
  nsCOMPtr<nsIChannel> channel = do_QueryInterface(request, &rv);
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "error QI nsIRequest to nsIChannel failed");
  if (NS_SUCCEEDED(rv)) rv = channel->GetURI(getter_AddRefs(uri));
  if (NS_SUCCEEDED(rv)) rv = mDestination->BeginCopy();

  NS_ENSURE_SUCCESS(rv, rv);
  return rv;
}

NS_IMETHODIMP nsCopyMessageStreamListener::EndCopy(nsIURI* uri,
                                                   nsresult status) {
  nsresult rv;
  bool copySucceeded = (status == NS_BINDING_SUCCEEDED);
  rv = mDestination->EndCopy(copySucceeded);
  // If this is a move and we finished the copy, delete the old message.
  bool moveMessage = false;

  nsCOMPtr<nsIMsgMailNewsUrl> mailURL(do_QueryInterface(uri));
  if (mailURL) rv = mailURL->IsUrlType(nsIMsgMailNewsUrl::eMove, &moveMessage);

  if (NS_FAILED(rv)) moveMessage = false;

  // OK, this is wrong if we're moving to an imap folder, for example. This
  // really says that we were able to pull the message from the source, NOT that
  // we were able to put it in the destination!
  if (moveMessage) {
    // don't do this if we're moving to an imap folder - that's handled
    // elsewhere.
    nsCOMPtr<nsIMsgImapMailFolder> destImap = do_QueryInterface(mDestination);
    // if the destination is a local folder, it will handle the delete from the
    // source in EndMove
    if (!destImap) rv = mDestination->EndMove(copySucceeded);
  }
  // Even if the above actions failed we probably still want to return NS_OK.
  // There should probably be some error dialog if either the copy or delete
  // failed.
  return NS_OK;
}

NS_IMETHODIMP nsCopyMessageStreamListener::OnStopRequest(nsIRequest* request,
                                                         nsresult aStatus) {
  nsresult rv;
  // We know the request is an nsIChannel we can get a URI from, but this is
  // probably bad form. See Bug 1528662.
  nsCOMPtr<nsIChannel> channel = do_QueryInterface(request, &rv);
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "error QI nsIRequest to nsIChannel failed");
  NS_ENSURE_SUCCESS(rv, rv);
  nsCOMPtr<nsIURI> uri;
  rv = channel->GetURI(getter_AddRefs(uri));
  NS_ENSURE_SUCCESS(rv, rv);
  return EndCopy(uri, aStatus);
}
