/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsCOMPtr.h"
#include "nsMsgFileHdr.h"
#include "nsMsgMessageFlags.h"
#include "nsNetUtil.h"
#include "nsIFileURL.h"
#include "HeaderReader.h"
#include "nsIFileStreams.h"
#include "nsIMimeConverter.h"

static inline uint32_t PRTimeToSeconds(PRTime aTimeUsec) {
  return uint32_t(aTimeUsec / PR_USEC_PER_SEC);
}

NS_IMPL_ISUPPORTS(nsMsgFileHdr, nsIMsgDBHdr)

nsMsgFileHdr::nsMsgFileHdr(const nsACString& aUri) {
  mUri = nsCString(aUri);
  mDate = 0;
  mFlags = 0;
}

nsMsgFileHdr::~nsMsgFileHdr() {}

nsresult nsMsgFileHdr::ReadFile() {
  if (mFile) {
    return NS_OK;
  }

  nsresult rv;

  nsCOMPtr<nsIURI> uri;
  NS_NewURI(getter_AddRefs(uri), mUri);
  nsCOMPtr<nsIFileURL> fileUrl = do_QueryInterface(uri);
  rv = fileUrl->GetFile(getter_AddRefs(mFile));
  NS_ENSURE_SUCCESS(rv, rv);

  nsCOMPtr<nsIFileInputStream> fileStream =
      do_CreateInstance(NS_LOCALFILEINPUTSTREAM_CONTRACTID);
  rv = fileStream->Init(mFile, PR_RDONLY, 0664, 0);
  NS_ENSURE_SUCCESS(rv, rv);

  uint32_t count;
  char buffer[8192];
  rv = fileStream->Read(&buffer[0], 8192, &count);
  NS_ENSURE_SUCCESS(rv, rv);

  auto cb = [&](HeaderReader::Hdr const& hdr) {
    auto name = hdr.Name(buffer);
    if (name.EqualsLiteral("Subject") && mSubject.IsEmpty()) {
      mSubject = hdr.Value(buffer);
    }
    if (name.EqualsLiteral("From") && mAuthor.IsEmpty()) {
      mAuthor = hdr.Value(buffer);
    }
    if (name.EqualsLiteral("To") && mRecipients.IsEmpty()) {
      mRecipients = hdr.Value(buffer);
    }
    if (name.EqualsLiteral("Cc") && mCcList.IsEmpty()) {
      mCcList = hdr.Value(buffer);
    }
    if (name.EqualsLiteral("Bcc") && mBccList.IsEmpty()) {
      mBccList = hdr.Value(buffer);
    }
    if (name.EqualsLiteral("Date") && mDate == 0) {
      PR_ParseTimeString(hdr.Value(buffer).get(), false, &mDate);
    }
    if (name.EqualsLiteral("Message-ID") && mMessageID.IsEmpty()) {
      mMessageID = hdr.Value(buffer);
      mMessageID.Trim("<>");
    }
    return true;
  };
  HeaderReader rdr;
  rdr.Parse(buffer, cb);

  nsCOMPtr<nsIMimeConverter> mimeConverter =
      do_GetService("@mozilla.org/messenger/mimeconverter;1");
  mimeConverter->DecodeMimeHeader(mSubject.get(), "UTF-8", false, true,
                                  mDecodedSubject);
  mimeConverter->DecodeMimeHeader(mAuthor.get(), "UTF-8", false, true,
                                  mDecodedAuthor);
  mimeConverter->DecodeMimeHeader(mRecipients.get(), "UTF-8", false, true,
                                  mDecodedRecipients);

  return rv;
}

NS_IMETHODIMP nsMsgFileHdr::SetStringProperty(const char* propertyName,
                                              const nsACString& propertyValue) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetStringProperty(const char* propertyName,
                                              nsACString& _retval) {
  if (!strcmp(propertyName, "dummyMsgUrl")) {
    _retval = mUri;
    return NS_OK;
  }
  _retval.Truncate();
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetUint32Property(const char* propertyName,
                                              uint32_t* _retval) {
  if (!strcmp(propertyName, "dummyMsgLastModifiedTime")) {
    nsresult rv = ReadFile();
    NS_ENSURE_SUCCESS(rv, rv);

    PRTime modifiedTime;
    mFile->GetLastModifiedTime(&modifiedTime);
    *_retval = PRTimeToSeconds(modifiedTime);
  }
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::SetUint32Property(const char* propertyName,
                                              uint32_t propertyVal) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetIsRead(bool* aIsRead) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::GetIsFlagged(bool* aIsFlagged) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::GetIsKilled(bool* aIsKilled) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::MarkRead(bool read) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::MarkFlagged(bool flagged) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::MarkHasAttachments(bool hasAttachments) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetPriority(nsMsgPriorityValue* aPriority) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::SetPriority(nsMsgPriorityValue aPriority) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetFlags(uint32_t* aFlags) {
  *aFlags = mFlags;
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::SetFlags(uint32_t aFlags) {
  mFlags = aFlags;
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::OrFlags(uint32_t flags, uint32_t* _retval) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::AndFlags(uint32_t flags, uint32_t* _retval) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetThreadId(nsMsgKey* aThreadId) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::SetThreadId(nsMsgKey aThreadId) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::GetMessageKey(nsMsgKey* aMessageKey) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::SetMessageKey(nsMsgKey aMessageKey) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetThreadParent(nsMsgKey* aThreadParent) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::SetThreadParent(nsMsgKey aThreadParent) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetMessageSize(uint32_t* aMessageSize) {
  nsresult rv = ReadFile();
  NS_ENSURE_SUCCESS(rv, rv);

  int64_t fileSize;
  mFile->GetFileSize(&fileSize);

  *aMessageSize = uint32_t(fileSize);
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::SetMessageSize(uint32_t aMessageSize) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetLineCount(uint32_t* aLineCount) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::SetLineCount(uint32_t aLineCount) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::GetMessageOffset(uint64_t* aMessageOffset) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::SetMessageOffset(uint64_t aMessageOffset) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetOfflineMessageSize(
    uint32_t* aOfflineMessageSize) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::SetOfflineMessageSize(
    uint32_t aOfflineMessageSize) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetDate(PRTime* aDate) {
  nsresult rv = ReadFile();
  NS_ENSURE_SUCCESS(rv, rv);

  *aDate = mDate;
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::SetDate(PRTime aDate) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::GetDateInSeconds(uint32_t* aDateInSeconds) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetMessageId(char** aMessageId) {
  nsresult rv = ReadFile();
  NS_ENSURE_SUCCESS(rv, rv);

  *aMessageId = strdup(mMessageID.get());
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::SetMessageId(const char* aMessageId) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetCcList(char** aCcList) {
  nsresult rv = ReadFile();
  NS_ENSURE_SUCCESS(rv, rv);

  *aCcList = strdup(mCcList.get());
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::SetCcList(const char* aCcList) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::GetBccList(char** aBccList) {
  nsresult rv = ReadFile();
  NS_ENSURE_SUCCESS(rv, rv);

  *aBccList = strdup(mBccList.get());
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::SetBccList(const char* aBccList) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::GetAuthor(char** aAuthor) {
  nsresult rv = ReadFile();
  NS_ENSURE_SUCCESS(rv, rv);

  *aAuthor = strdup(mAuthor.get());
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::SetAuthor(const char* aAuthor) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::GetSubject(nsACString& aSubject) {
  nsresult rv = ReadFile();
  NS_ENSURE_SUCCESS(rv, rv);

  aSubject = mSubject;
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::SetSubject(const nsACString& aSubject) {
  mSubject = aSubject;
  bool strippedRE = NS_MsgStripRE(mSubject, mSubject);
  nsCOMPtr<nsIMimeConverter> mimeConverter =
      do_GetService("@mozilla.org/messenger/mimeconverter;1");
  mimeConverter->DecodeMimeHeader(mSubject.get(), "UTF-8", false, true,
                                  mDecodedSubject);
  if (strippedRE) {
    mFlags |= nsMsgMessageFlags::HasRe;
  }
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetRecipients(char** aRecipients) {
  nsresult rv = ReadFile();
  NS_ENSURE_SUCCESS(rv, rv);

  *aRecipients = strdup(mRecipients.get());
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::SetRecipients(const char* aRecipients) {
  // FIXME: should do assignment (maybe not used but if used, a trap!)
  // Same for all the other unimplemented setters here.
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP nsMsgFileHdr::SetReferences(const nsACString& references) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP nsMsgFileHdr::GetNumReferences(uint16_t* aNumReferences) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetStringReference(int32_t refNum,
                                               nsACString& _retval) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP nsMsgFileHdr::GetMime2DecodedAuthor(
    nsAString& aMime2DecodedAuthor) {
  nsresult rv = ReadFile();
  NS_ENSURE_SUCCESS(rv, rv);

  aMime2DecodedAuthor.Truncate();
  aMime2DecodedAuthor.Assign(mDecodedAuthor);
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetMime2DecodedSubject(
    nsAString& aMime2DecodedSubject) {
  nsresult rv = ReadFile();
  NS_ENSURE_SUCCESS(rv, rv);

  aMime2DecodedSubject.Truncate();
  aMime2DecodedSubject.Assign(mDecodedSubject);
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetMime2DecodedRecipients(
    nsAString& aMime2DecodedRecipients) {
  nsresult rv = ReadFile();
  NS_ENSURE_SUCCESS(rv, rv);

  aMime2DecodedRecipients.Truncate();
  aMime2DecodedRecipients.Assign(mDecodedRecipients);
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetAuthorCollationKey(nsTArray<uint8_t>& _retval) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetSubjectCollationKey(nsTArray<uint8_t>& _retval) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetRecipientsCollationKey(
    nsTArray<uint8_t>& _retval) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetCharset(char** aCharset) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::SetCharset(const char* aCharset) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP nsMsgFileHdr::GetEffectiveCharset(nsACString& aEffectiveCharset) {
  return NS_OK;
}

NS_IMETHODIMP nsMsgFileHdr::GetAccountKey(char** aAccountKey) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::SetAccountKey(const char* aAccountKey) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP nsMsgFileHdr::GetFolder(nsIMsgFolder** aFolder) { return NS_OK; }

NS_IMETHODIMP nsMsgFileHdr::GetProperties(nsTArray<nsCString>& headers) {
  return NS_OK;
}
