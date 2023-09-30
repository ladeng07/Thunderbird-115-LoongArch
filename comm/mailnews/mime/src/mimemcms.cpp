/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsICMSMessage.h"
#include "nsICMSMessageErrors.h"
#include "nsICMSDecoder.h"
#include "nsICryptoHash.h"
#include "mimemcms.h"
#include "mimecryp.h"
#include "nsMimeTypes.h"
#include "nspr.h"
#include "nsMimeStringResources.h"
#include "mimemsg.h"
#include "mimemoz2.h"
#include "nsIURI.h"
#include "nsIMsgWindow.h"
#include "nsIMsgMailNewsUrl.h"
#include "nsIMsgSMIMEHeaderSink.h"
#include "nsCOMPtr.h"
#include "nsIX509Cert.h"
#include "plstr.h"
#include "nsComponentManagerUtils.h"
#include "nsIMailChannel.h"

#define MIME_SUPERCLASS mimeMultipartSignedClass
MimeDefClass(MimeMultipartSignedCMS, MimeMultipartSignedCMSClass,
             mimeMultipartSignedCMSClass, &MIME_SUPERCLASS);

static int MimeMultipartSignedCMS_initialize(MimeObject*);

static void* MimeMultCMS_init(MimeObject*);
static int MimeMultCMS_data_hash(const char*, int32_t, void*);
static int MimeMultCMS_sig_hash(const char*, int32_t, void*);
static int MimeMultCMS_data_eof(void*, bool);
static int MimeMultCMS_sig_eof(void*, bool);
static int MimeMultCMS_sig_init(void*, MimeObject*, MimeHeaders*);
static char* MimeMultCMS_generate(void*);
static void MimeMultCMS_free(void*);
static void MimeMultCMS_suppressed_child(void* crypto_closure);

extern int SEC_ERROR_CERT_ADDR_MISMATCH;

static int MimeMultipartSignedCMSClassInitialize(
    MimeMultipartSignedCMSClass* clazz) {
  MimeObjectClass* oclass = (MimeObjectClass*)clazz;
  MimeMultipartSignedClass* sclass = (MimeMultipartSignedClass*)clazz;

  oclass->initialize = MimeMultipartSignedCMS_initialize;

  sclass->crypto_init = MimeMultCMS_init;
  sclass->crypto_data_hash = MimeMultCMS_data_hash;
  sclass->crypto_data_eof = MimeMultCMS_data_eof;
  sclass->crypto_signature_init = MimeMultCMS_sig_init;
  sclass->crypto_signature_hash = MimeMultCMS_sig_hash;
  sclass->crypto_signature_eof = MimeMultCMS_sig_eof;
  sclass->crypto_generate_html = MimeMultCMS_generate;
  sclass->crypto_notify_suppressed_child = MimeMultCMS_suppressed_child;
  sclass->crypto_free = MimeMultCMS_free;

  PR_ASSERT(!oclass->class_initialized);
  return 0;
}

static int MimeMultipartSignedCMS_initialize(MimeObject* object) {
  return ((MimeObjectClass*)&MIME_SUPERCLASS)->initialize(object);
}

typedef struct MimeMultCMSdata {
  int16_t hash_type;
  nsCOMPtr<nsICryptoHash> data_hash_context;
  nsCOMPtr<nsICMSDecoder> sig_decoder_context;
  nsCOMPtr<nsICMSMessage> content_info;
  char* sender_addr;
  bool decoding_failed;
  bool reject_signature;
  unsigned char* item_data;
  uint32_t item_len;
  MimeObject* self;
  nsCOMPtr<nsIMsgSMIMEHeaderSink> smimeHeaderSink;
  nsCString url;

  MimeMultCMSdata()
      : hash_type(0),
        sender_addr(nullptr),
        decoding_failed(false),
        reject_signature(false),
        item_data(nullptr),
        self(nullptr) {}

  ~MimeMultCMSdata() {
    PR_FREEIF(sender_addr);

    // Do a graceful shutdown of the nsICMSDecoder and release the nsICMSMessage
    if (sig_decoder_context) {
      nsCOMPtr<nsICMSMessage> cinfo;
      sig_decoder_context->Finish(getter_AddRefs(cinfo));
    }

    delete[] item_data;
  }
} MimeMultCMSdata;

/* #### MimeEncryptedCMS and MimeMultipartSignedCMS have a sleazy,
        incestuous, dysfunctional relationship. */
extern bool MimeAnyParentCMSSigned(MimeObject* obj);
extern void MimeCMSGetFromSender(MimeObject* obj, nsCString& from_addr,
                                 nsCString& from_name, nsCString& sender_addr,
                                 nsCString& sender_name);
extern bool MimeCMSHeadersAndCertsMatch(
    MimeObject* obj, nsICMSMessage*, bool* signing_cert_without_email_address);
extern void MimeCMSRequestAsyncSignatureVerification(
    nsICMSMessage* aCMSMsg, const char* aFromAddr, const char* aFromName,
    const char* aSenderAddr, const char* aSenderName,
    nsIMsgSMIMEHeaderSink* aHeaderSink, int32_t aMimeNestingLevel,
    const nsCString& aMsgNeckoURL, const nsCString& aOriginMimePartNumber,
    const nsTArray<uint8_t>& aDigestData, int16_t aDigestType);
extern char* MimeCMS_MakeSAURL(MimeObject* obj);
extern char* IMAP_CreateReloadAllPartsUrl(const char* url);
extern int MIMEGetRelativeCryptoNestLevel(MimeObject* obj);

static void* MimeMultCMS_init(MimeObject* obj) {
  MimeHeaders* hdrs = obj->headers;
  MimeMultCMSdata* data = 0;
  char *ct, *micalg;
  int16_t hash_type;
  nsresult rv;

  data = new MimeMultCMSdata;
  if (!data) return 0;

  data->self = obj;

  mime_stream_data* msd =
      (mime_stream_data*)(data->self->options->stream_closure);
  if (msd) {
    nsIChannel* channel = msd->channel;  // note the lack of ref counting...
    if (channel) {
      nsCOMPtr<nsIURI> uri;
      channel->GetURI(getter_AddRefs(uri));
      if (uri) {
        rv = uri->GetSpec(data->url);

        // We only want to update the UI if the current mime transaction
        // is intended for display.
        // If the current transaction is intended for background processing,
        // we can learn that by looking at the additional header=filter
        // string contained in the URI.
        //
        // If we find something, we do not set smimeHeaderSink,
        // which will prevent us from giving UI feedback.
        //
        // If we do not find header=filter, we assume the result of the
        // processing will be shown in the UI.

        if (!strstr(data->url.get(), "?header=filter") &&
            !strstr(data->url.get(), "&header=filter") &&
            !strstr(data->url.get(), "?header=attach") &&
            !strstr(data->url.get(), "&header=attach")) {
          nsCOMPtr<nsIMailChannel> mailChannel = do_QueryInterface(channel);
          if (mailChannel) {
            mailChannel->GetSmimeHeaderSink(
                getter_AddRefs(data->smimeHeaderSink));
          }
        }
      }
    }  // if channel
  }    // if msd

  if (obj->parent && MimeAnyParentCMSSigned(obj)) {
    // Parent is signed. We know this part is a signature, too, because
    // multipart doesn't allow encryption.
    // We don't support "inner sign" with outer sign, because the
    // inner encrypted part could have been produced by an attacker who
    // stripped away a part containing the signature (S/MIME doesn't
    // have integrity protection).
    // Also we don't want to support sign-then-sign, that's misleading,
    // which part would be shown as having a signature?
    // We skip signature verfication, and return bad signature status.

    // Note: We must return a valid pointer to ourselve's data,
    // otherwise the parent will attempt to re-init us.

    data->reject_signature = true;
    if (data->smimeHeaderSink) {
      int aRelativeNestLevel = MIMEGetRelativeCryptoNestLevel(data->self);
      nsAutoCString partnum;
      partnum.Adopt(mime_part_address(data->self));
      data->smimeHeaderSink->SignedStatus(aRelativeNestLevel,
                                          nsICMSMessageErrors::GENERAL_ERROR,
                                          nullptr, data->url, partnum);
    }
    return data;
  }

  ct = MimeHeaders_get(hdrs, HEADER_CONTENT_TYPE, false, false);
  if (!ct) {
    delete data;
    return 0; /* #### bogus message?  out of memory? */
  }
  micalg = MimeHeaders_get_parameter(ct, PARAM_MICALG, NULL, NULL);
  PR_Free(ct);
  ct = 0;
  if (!micalg) {
    delete data;
    return 0; /* #### bogus message?  out of memory? */
  }

  if (!PL_strcasecmp(micalg, PARAM_MICALG_SHA256) ||
      !PL_strcasecmp(micalg, PARAM_MICALG_SHA256_2) ||
      !PL_strcasecmp(micalg, PARAM_MICALG_SHA256_3))
    hash_type = nsICryptoHash::SHA256;
  else if (!PL_strcasecmp(micalg, PARAM_MICALG_SHA384) ||
           !PL_strcasecmp(micalg, PARAM_MICALG_SHA384_2) ||
           !PL_strcasecmp(micalg, PARAM_MICALG_SHA384_3))
    hash_type = nsICryptoHash::SHA384;
  else if (!PL_strcasecmp(micalg, PARAM_MICALG_SHA512) ||
           !PL_strcasecmp(micalg, PARAM_MICALG_SHA512_2) ||
           !PL_strcasecmp(micalg, PARAM_MICALG_SHA512_3))
    hash_type = nsICryptoHash::SHA512;
  else {
    data->reject_signature = true;
    if (data->smimeHeaderSink) {
      int aRelativeNestLevel = MIMEGetRelativeCryptoNestLevel(data->self);
      nsAutoCString partnum;
      partnum.Adopt(mime_part_address(data->self));
      data->smimeHeaderSink->SignedStatus(aRelativeNestLevel,
                                          nsICMSMessageErrors::GENERAL_ERROR,
                                          nullptr, data->url, partnum);
    }
    PR_Free(micalg);
    return data;
  }

  PR_Free(micalg);
  micalg = 0;

  data->hash_type = hash_type;

  data->data_hash_context =
      do_CreateInstance("@mozilla.org/security/hash;1", &rv);
  if (NS_FAILED(rv)) {
    delete data;
    return 0;
  }

  rv = data->data_hash_context->Init(data->hash_type);
  if (NS_FAILED(rv)) {
    delete data;
    return 0;
  }

  PR_SetError(0, 0);

  return data;
}

static int MimeMultCMS_data_hash(const char* buf, int32_t size,
                                 void* crypto_closure) {
  MimeMultCMSdata* data = (MimeMultCMSdata*)crypto_closure;
  if (!data) {
    return -1;
  }

  if (data->reject_signature) {
    return 0;
  }

  if (!data->data_hash_context) {
    return -1;
  }

  PR_SetError(0, 0);
  nsresult rv = data->data_hash_context->Update((unsigned char*)buf, size);
  data->decoding_failed = NS_FAILED(rv);

  return 0;
}

static int MimeMultCMS_data_eof(void* crypto_closure, bool abort_p) {
  MimeMultCMSdata* data = (MimeMultCMSdata*)crypto_closure;
  if (!data) {
    return -1;
  }

  if (data->reject_signature) {
    return 0;
  }

  if (!data->data_hash_context) {
    return -1;
  }

  nsAutoCString hashString;
  data->data_hash_context->Finish(false, hashString);
  PR_SetError(0, 0);

  data->item_len = hashString.Length();
  data->item_data = new unsigned char[data->item_len];
  if (!data->item_data) return MIME_OUT_OF_MEMORY;

  memcpy(data->item_data, hashString.get(), data->item_len);

  // Release our reference to nsICryptoHash //
  data->data_hash_context = nullptr;

  /* At this point, data->item.data contains a digest for the first part.
   When we process the signature, the security library will compare this
   digest to what's in the signature object. */

  return 0;
}

static int MimeMultCMS_sig_init(void* crypto_closure,
                                MimeObject* multipart_object,
                                MimeHeaders* signature_hdrs) {
  MimeMultCMSdata* data = (MimeMultCMSdata*)crypto_closure;
  char* ct;
  int status = 0;
  nsresult rv;

  if (data->reject_signature) {
    return 0;
  }

  if (!signature_hdrs) {
    return -1;
  }

  ct = MimeHeaders_get(signature_hdrs, HEADER_CONTENT_TYPE, true, false);

  /* Verify that the signature object is of the right type. */
  if (!ct || /* is not a signature type */
      (PL_strcasecmp(ct, APPLICATION_XPKCS7_SIGNATURE) != 0 &&
       PL_strcasecmp(ct, APPLICATION_PKCS7_SIGNATURE) != 0)) {
    status = -1; /* #### error msg about bogus message */
  }
  PR_FREEIF(ct);
  if (status < 0) return status;

  data->sig_decoder_context = do_CreateInstance(NS_CMSDECODER_CONTRACTID, &rv);
  if (NS_FAILED(rv)) return 0;

  rv = data->sig_decoder_context->Start(nullptr, nullptr);
  if (NS_FAILED(rv)) {
    status = PR_GetError();
    if (status >= 0) status = -1;
  }
  return status;
}

static int MimeMultCMS_sig_hash(const char* buf, int32_t size,
                                void* crypto_closure) {
  MimeMultCMSdata* data = (MimeMultCMSdata*)crypto_closure;
  nsresult rv;

  if (!data) {
    return -1;
  }

  if (data->reject_signature) {
    return 0;
  }

  if (!data->sig_decoder_context) {
    return -1;
  }

  rv = data->sig_decoder_context->Update(buf, size);
  data->decoding_failed = NS_FAILED(rv);

  return 0;
}

static int MimeMultCMS_sig_eof(void* crypto_closure, bool abort_p) {
  MimeMultCMSdata* data = (MimeMultCMSdata*)crypto_closure;

  if (!data) {
    return -1;
  }

  if (data->reject_signature) {
    return 0;
  }

  /* Hand an EOF to the crypto library.

   We save away the value returned and will use it later to emit a
   blurb about whether the signature validation was cool.
   */

  if (data->sig_decoder_context) {
    data->sig_decoder_context->Finish(getter_AddRefs(data->content_info));

    // Release our reference to nsICMSDecoder //
    data->sig_decoder_context = nullptr;
  }

  return 0;
}

static void MimeMultCMS_free(void* crypto_closure) {
  MimeMultCMSdata* data = (MimeMultCMSdata*)crypto_closure;
  if (!data) return;

  delete data;
}

static void MimeMultCMS_suppressed_child(void* crypto_closure) {
  // I'm a multipart/signed. If one of my cryptographic child elements
  // was suppressed, then I want my signature to be shown as invalid.
  MimeMultCMSdata* data = (MimeMultCMSdata*)crypto_closure;
  if (data && data->smimeHeaderSink) {
    if (data->reject_signature) {
      return;
    }

    nsAutoCString partnum;
    partnum.Adopt(mime_part_address(data->self));
    data->smimeHeaderSink->SignedStatus(
        MIMEGetRelativeCryptoNestLevel(data->self),
        nsICMSMessageErrors::GENERAL_ERROR, nullptr, data->url, partnum);
  }
}

static char* MimeMultCMS_generate(void* crypto_closure) {
  MimeMultCMSdata* data = (MimeMultCMSdata*)crypto_closure;
  if (!data) return 0;
  nsCOMPtr<nsIX509Cert> signerCert;

  int aRelativeNestLevel = MIMEGetRelativeCryptoNestLevel(data->self);

  if (aRelativeNestLevel < 0) return nullptr;

  if (aRelativeNestLevel >= 0) {
    // maxWantedNesting 1: only want outermost nesting level
    if (aRelativeNestLevel > 1) return nullptr;
  }

  nsAutoCString partnum;
  partnum.Adopt(mime_part_address(data->self));

  if (data->self->options->missing_parts) {
    // We were not given all parts of the message.
    // We are therefore unable to verify correctness of the signature.

    if (data->smimeHeaderSink) {
      data->smimeHeaderSink->SignedStatus(
          aRelativeNestLevel, nsICMSMessageErrors::VERIFY_NOT_YET_ATTEMPTED,
          nullptr, data->url, partnum);
    }
    return nullptr;
  }

  if (!data->content_info) {
    /* No content_info at all -- since we're inside a multipart/signed,
     that means that we've either gotten a message that was truncated
     before the signature part, or we ran out of memory, or something
     awful has happened.
     */
    return nullptr;
  }

  nsCString from_addr;
  nsCString from_name;
  nsCString sender_addr;
  nsCString sender_name;

  MimeCMSGetFromSender(data->self, from_addr, from_name, sender_addr,
                       sender_name);

  nsTArray<uint8_t> digest;
  digest.AppendElements(data->item_data, data->item_len);

  if (!data->reject_signature && data->smimeHeaderSink) {
    MimeCMSRequestAsyncSignatureVerification(
        data->content_info, from_addr.get(), from_name.get(), sender_addr.get(),
        sender_name.get(), data->smimeHeaderSink, aRelativeNestLevel, data->url,
        partnum, digest, data->hash_type);
  }

  if (data->content_info) {
#if 0  // XXX Fix this. What do we do here? //
    if (SEC_CMSContainsCertsOrCrls(data->content_info))
    {
      /* #### call libsec telling it to import the certs */
    }
#endif
  }

  return nullptr;
}
