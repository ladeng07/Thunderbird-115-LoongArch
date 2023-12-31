/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Text import addressbook interfaces
 */

#include "nscore.h"
#include "nsCOMPtr.h"
#include "nsIImportService.h"
#include "nsMsgI18N.h"
#include "nsTextImport.h"
#include "nsIImportGeneric.h"
#include "nsIImportAddressBooks.h"
#include "nsIImportABDescriptor.h"
#include "nsIImportFieldMap.h"
#include "nsIAbLDIFService.h"
#include "nsTextFormatter.h"
#include "nsImportStringBundle.h"
#include "nsTextAddress.h"
#include "nsIPrefService.h"
#include "nsIPrefBranch.h"
#include "ImportDebug.h"
#include "nsNetUtil.h"
#include "nsMsgUtils.h"

#define TEXT_MSGS_URL "chrome://messenger/locale/textImportMsgs.properties"
#define TEXTIMPORT_NAME 2000
#define TEXTIMPORT_DESCRIPTION 2001
#define TEXTIMPORT_ADDRESS_NAME 2002
#define TEXTIMPORT_ADDRESS_SUCCESS 2003
#define TEXTIMPORT_ADDRESS_BADPARAM 2004
#define TEXTIMPORT_ADDRESS_BADSOURCEFILE 2005
#define TEXTIMPORT_ADDRESS_CONVERTERROR 2006

class ImportAddressImpl final : public nsIImportAddressBooks {
 public:
  explicit ImportAddressImpl(nsIStringBundle* aStringBundle);

  static nsresult Create(nsIImportAddressBooks** aImport,
                         nsIStringBundle* aStringBundle);

  // nsISupports interface
  NS_DECL_THREADSAFE_ISUPPORTS

  // nsIImportAddressBooks interface

  NS_IMETHOD GetSupportsMultiple(bool* _retval) override {
    *_retval = false;
    return NS_OK;
  }

  NS_IMETHOD GetAutoFind(char16_t** description, bool* _retval) override;

  NS_IMETHOD GetNeedsFieldMap(nsIFile* location, bool* _retval) override;

  NS_IMETHOD GetDefaultLocation(nsIFile** location, bool* found,
                                bool* userVerify) override;

  NS_IMETHOD FindAddressBooks(
      nsIFile* location,
      nsTArray<RefPtr<nsIImportABDescriptor>>& books) override;

  NS_IMETHOD InitFieldMap(nsIImportFieldMap* fieldMap) override;

  NS_IMETHOD ImportAddressBook(nsIImportABDescriptor* source,
                               nsIAbDirectory* destination,
                               nsIImportFieldMap* fieldMap,
                               nsISupports* aSupportService,
                               char16_t** errorLog, char16_t** successLog,
                               bool* fatalError) override;

  NS_IMETHOD GetImportProgress(uint32_t* _retval) override;

  NS_IMETHOD GetSampleData(int32_t index, bool* pFound,
                           char16_t** pStr) override;

  NS_IMETHOD SetSampleLocation(nsIFile*) override;

 private:
  void ClearSampleFile(void);
  void SaveFieldMap(nsIImportFieldMap* pMap);

  static void ReportSuccess(nsString& name, nsString* pStream,
                            nsIStringBundle* pBundle);
  static void SetLogs(nsString& success, nsString& error, char16_t** pError,
                      char16_t** pSuccess);
  static void ReportError(int32_t errorNum, nsString& name, nsString* pStream,
                          nsIStringBundle* pBundle);
  static void SanitizeSampleData(nsString& val);

 private:
  ~ImportAddressImpl() {}
  nsTextAddress m_text;
  bool m_haveDelim;
  nsCOMPtr<nsIFile> m_fileLoc;
  nsCOMPtr<nsIStringBundle> m_notProxyBundle;
  char16_t m_delim;
  uint32_t m_bytesImported;
};

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

nsTextImport::nsTextImport() {
  IMPORT_LOG0("nsTextImport Module Created\n");

  nsImportStringBundle::GetStringBundle(TEXT_MSGS_URL,
                                        getter_AddRefs(m_stringBundle));
}

nsTextImport::~nsTextImport() { IMPORT_LOG0("nsTextImport Module Deleted\n"); }

NS_IMPL_ISUPPORTS(nsTextImport, nsIImportModule)

NS_IMETHODIMP nsTextImport::GetName(char16_t** name) {
  NS_ENSURE_ARG_POINTER(name);
  *name = nsImportStringBundle::GetStringByID(TEXTIMPORT_NAME, m_stringBundle);
  return NS_OK;
}

NS_IMETHODIMP nsTextImport::GetDescription(char16_t** name) {
  NS_ENSURE_ARG_POINTER(name);
  *name = nsImportStringBundle::GetStringByID(TEXTIMPORT_DESCRIPTION,
                                              m_stringBundle);

  return NS_OK;
}

NS_IMETHODIMP nsTextImport::GetSupports(char** supports) {
  NS_ENSURE_ARG_POINTER(supports);
  *supports = strdup(kTextSupportsString);
  return NS_OK;
}

NS_IMETHODIMP nsTextImport::GetSupportsUpgrade(bool* pUpgrade) {
  NS_ASSERTION(pUpgrade != nullptr, "null ptr");
  if (!pUpgrade) return NS_ERROR_NULL_POINTER;

  *pUpgrade = false;
  return NS_OK;
}

NS_IMETHODIMP nsTextImport::GetImportInterface(const char* pImportType,
                                               nsISupports** ppInterface) {
  NS_ENSURE_ARG_POINTER(pImportType);
  NS_ENSURE_ARG_POINTER(ppInterface);

  *ppInterface = nullptr;
  nsresult rv;

  if (!strcmp(pImportType, "addressbook")) {
    // create the nsIImportMail interface and return it!
    nsCOMPtr<nsIImportAddressBooks> pAddress;
    nsCOMPtr<nsIImportGeneric> pGeneric;
    rv = ImportAddressImpl::Create(getter_AddRefs(pAddress), m_stringBundle);
    if (NS_SUCCEEDED(rv)) {
      nsCOMPtr<nsIImportService> impSvc(
          do_GetService(NS_IMPORTSERVICE_CONTRACTID, &rv));
      if (NS_SUCCEEDED(rv)) {
        rv = impSvc->CreateNewGenericAddressBooks(getter_AddRefs(pGeneric));
        if (NS_SUCCEEDED(rv)) {
          pGeneric->SetData("addressInterface", pAddress);
          nsCOMPtr<nsISupports> pInterface(do_QueryInterface(pGeneric));
          pInterface.forget(ppInterface);
        }
      }
    }
    return rv;
  }
  return NS_ERROR_NOT_AVAILABLE;
}

/////////////////////////////////////////////////////////////////////////////////

nsresult ImportAddressImpl::Create(nsIImportAddressBooks** aImport,
                                   nsIStringBundle* aStringBundle) {
  NS_ENSURE_ARG_POINTER(aImport);
  NS_ADDREF(*aImport = new ImportAddressImpl(aStringBundle));
  return NS_OK;
}

ImportAddressImpl::ImportAddressImpl(nsIStringBundle* aStringBundle)
    : m_notProxyBundle(aStringBundle) {
  m_haveDelim = false;
}

NS_IMPL_ISUPPORTS(ImportAddressImpl, nsIImportAddressBooks)

NS_IMETHODIMP ImportAddressImpl::GetAutoFind(char16_t** addrDescription,
                                             bool* _retval) {
  NS_ASSERTION(addrDescription != nullptr, "null ptr");
  NS_ASSERTION(_retval != nullptr, "null ptr");
  if (!addrDescription || !_retval) return NS_ERROR_NULL_POINTER;

  nsString str;
  *_retval = false;

  if (!m_notProxyBundle) return NS_ERROR_FAILURE;

  nsImportStringBundle::GetStringByID(TEXTIMPORT_ADDRESS_NAME, m_notProxyBundle,
                                      str);
  *addrDescription = ToNewUnicode(str);
  return NS_OK;
}

NS_IMETHODIMP ImportAddressImpl::GetDefaultLocation(nsIFile** ppLoc,
                                                    bool* found,
                                                    bool* userVerify) {
  NS_ASSERTION(found != nullptr, "null ptr");
  NS_ASSERTION(ppLoc != nullptr, "null ptr");
  NS_ASSERTION(userVerify != nullptr, "null ptr");
  if (!found || !userVerify || !ppLoc) return NS_ERROR_NULL_POINTER;

  *ppLoc = nullptr;
  *found = false;
  *userVerify = true;
  return NS_OK;
}

NS_IMETHODIMP ImportAddressImpl::FindAddressBooks(
    nsIFile* pLoc, nsTArray<RefPtr<nsIImportABDescriptor>>& books) {
  NS_ASSERTION(pLoc != nullptr, "null ptr");
  if (!pLoc) return NS_ERROR_NULL_POINTER;

  books.Clear();
  ClearSampleFile();

  bool exists = false;
  nsresult rv = pLoc->Exists(&exists);
  if (NS_FAILED(rv) || !exists) return NS_ERROR_FAILURE;

  bool isFile = false;
  rv = pLoc->IsFile(&isFile);
  if (NS_FAILED(rv) || !isFile) return NS_ERROR_FAILURE;

  rv = m_text.DetermineDelim(pLoc);

  if (NS_FAILED(rv)) {
    IMPORT_LOG0("*** Error determining delimitter\n");
    return rv;
  }
  m_haveDelim = true;
  m_delim = m_text.GetDelim();

  m_fileLoc = pLoc;

  /* Build an address book descriptor based on the file passed in! */
  nsString name;
  m_fileLoc->GetLeafName(name);
  if (NS_FAILED(rv)) {
    IMPORT_LOG0("*** Failed getting leaf name of file\n");
    return rv;
  }

  int32_t idx = name.RFindChar('.');
  if ((idx != -1) && (idx > 0) && ((name.Length() - idx - 1) < 5)) {
    name.SetLength(idx);
  }

  nsCOMPtr<nsIImportABDescriptor> desc;

  nsCOMPtr<nsIImportService> impSvc(
      do_GetService(NS_IMPORTSERVICE_CONTRACTID, &rv));
  if (NS_FAILED(rv)) {
    IMPORT_LOG0("*** Failed to obtain the import service\n");
    return rv;
  }

  rv = impSvc->CreateNewABDescriptor(getter_AddRefs(desc));
  if (NS_SUCCEEDED(rv)) {
    int64_t sz = 0;
    pLoc->GetFileSize(&sz);
    desc->SetPreferredName(name);
    desc->SetSize((uint32_t)sz);
    desc->SetAbFile(m_fileLoc);
    books.AppendElement(desc);
  }
  if (NS_FAILED(rv)) {
    IMPORT_LOG0("*** Error creating address book descriptor for text import\n");
    return rv;
  }
  return NS_OK;
}

void ImportAddressImpl::ReportSuccess(nsString& name, nsString* pStream,
                                      nsIStringBundle* pBundle) {
  if (!pStream) return;

  // load the success string
  char16_t* pFmt =
      nsImportStringBundle::GetStringByID(TEXTIMPORT_ADDRESS_SUCCESS, pBundle);

  nsString pText;
  nsTextFormatter::ssprintf(pText, pFmt, name.get());
  pStream->Append(pText);
  free(pFmt);
  pStream->Append(char16_t('\n'));
}

void ImportAddressImpl::ReportError(int32_t errorNum, nsString& name,
                                    nsString* pStream,
                                    nsIStringBundle* pBundle) {
  if (!pStream) return;

  // load the error string
  char16_t* pFmt = nsImportStringBundle::GetStringByID(errorNum, pBundle);
  nsString pText;
  nsTextFormatter::ssprintf(pText, pFmt, name.get());
  pStream->Append(pText);
  free(pFmt);
  pStream->Append(char16_t('\n'));
}

void ImportAddressImpl::SetLogs(nsString& success, nsString& error,
                                char16_t** pError, char16_t** pSuccess) {
  if (pError) *pError = ToNewUnicode(error);
  if (pSuccess) *pSuccess = ToNewUnicode(success);
}

NS_IMETHODIMP
ImportAddressImpl::ImportAddressBook(nsIImportABDescriptor* pSource,
                                     nsIAbDirectory* pDestination,
                                     nsIImportFieldMap* fieldMap,
                                     nsISupports* aSupportService,
                                     char16_t** pErrorLog,
                                     char16_t** pSuccessLog, bool* fatalError) {
  NS_ASSERTION(pSource != nullptr, "null ptr");
  NS_ASSERTION(pDestination != nullptr, "null ptr");
  NS_ASSERTION(fatalError != nullptr, "null ptr");

  m_bytesImported = 0;

  nsString success, error;
  if (!pSource || !pDestination || !fatalError) {
    IMPORT_LOG0("*** Bad param passed to text address import\n");
    nsImportStringBundle::GetStringByID(TEXTIMPORT_ADDRESS_BADPARAM,
                                        m_notProxyBundle, error);

    SetLogs(success, error, pErrorLog, pSuccessLog);

    if (fatalError) *fatalError = true;

    return NS_ERROR_NULL_POINTER;
  }

  ClearSampleFile();

  bool addrAbort = false;
  nsString name;
  pSource->GetPreferredName(name);

  uint32_t addressSize = 0;
  pSource->GetSize(&addressSize);
  if (addressSize == 0) {
    IMPORT_LOG0("Address book size is 0, skipping import.\n");
    ReportSuccess(name, &success, m_notProxyBundle);
    SetLogs(success, error, pErrorLog, pSuccessLog);
    return NS_OK;
  }

  nsCOMPtr<nsIFile> inFile;
  if (NS_FAILED(pSource->GetAbFile(getter_AddRefs(inFile)))) {
    ReportError(TEXTIMPORT_ADDRESS_BADSOURCEFILE, name, &error,
                m_notProxyBundle);
    SetLogs(success, error, pErrorLog, pSuccessLog);
    return NS_ERROR_FAILURE;
  }

  if (!aSupportService) {
    IMPORT_LOG0("Missing support service to import call");
    return NS_ERROR_FAILURE;
  }

  bool isLDIF = false;
  nsresult rv;
  nsCOMPtr<nsIAbLDIFService> ldifService(
      do_QueryInterface(aSupportService, &rv));

  if (NS_SUCCEEDED(rv)) {
    rv = ldifService->IsLDIFFile(inFile, &isLDIF);
    if (NS_FAILED(rv)) {
      IMPORT_LOG0("*** Error reading address file\n");
    }
  }

  if (NS_FAILED(rv)) {
    ReportError(TEXTIMPORT_ADDRESS_CONVERTERROR, name, &error,
                m_notProxyBundle);
    SetLogs(success, error, pErrorLog, pSuccessLog);
    return rv;
  }

  if (isLDIF) {
    if (ldifService)
      rv = ldifService->ImportLDIFFile(pDestination, inFile, false,
                                       &m_bytesImported);
    else
      return NS_ERROR_FAILURE;
  } else {
    rv = m_text.ImportAddresses(&addrAbort, name.get(), inFile, pDestination,
                                fieldMap, error, &m_bytesImported);
    SaveFieldMap(fieldMap);
  }

  if (NS_SUCCEEDED(rv) && error.IsEmpty()) {
    ReportSuccess(name, &success, m_notProxyBundle);
    SetLogs(success, error, pErrorLog, pSuccessLog);
  } else {
    ReportError(TEXTIMPORT_ADDRESS_CONVERTERROR, name, &error,
                m_notProxyBundle);
    SetLogs(success, error, pErrorLog, pSuccessLog);
  }

  IMPORT_LOG0("*** Text address import done\n");
  return rv;
}

NS_IMETHODIMP ImportAddressImpl::GetImportProgress(uint32_t* _retval) {
  NS_ENSURE_ARG_POINTER(_retval);
  *_retval = m_bytesImported;
  return NS_OK;
}

NS_IMETHODIMP ImportAddressImpl::GetNeedsFieldMap(nsIFile* aLocation,
                                                  bool* _retval) {
  NS_ENSURE_ARG_POINTER(_retval);
  NS_ENSURE_ARG_POINTER(aLocation);

  *_retval = true;
  bool exists = false;
  bool isFile = false;

  nsresult rv = aLocation->Exists(&exists);
  rv = aLocation->IsFile(&isFile);

  if (!exists || !isFile) return NS_ERROR_FAILURE;

  bool isLDIF = false;
  nsCOMPtr<nsIAbLDIFService> ldifService =
      do_GetService("@mozilla.org/addressbook/abldifservice;1", &rv);

  if (NS_SUCCEEDED(rv)) rv = ldifService->IsLDIFFile(aLocation, &isLDIF);

  if (NS_FAILED(rv)) {
    IMPORT_LOG0("*** Error determining if file is of type LDIF\n");
    return rv;
  }

  if (isLDIF) *_retval = false;

  return NS_OK;
}

void ImportAddressImpl::SanitizeSampleData(nsString& val) {
  // remove any line-feeds...
  int32_t offset = val.Find(u"\x0D\x0A"_ns);
  while (offset != -1) {
    val.Replace(offset, 2, u", "_ns);
    offset = val.Find(u"\x0D\x0A"_ns, offset + 2);
  }
  offset = val.FindChar(13);
  while (offset != -1) {
    val.Replace(offset, 1, ',');
    offset = val.FindChar(13, offset + 2);
  }
  offset = val.FindChar(10);
  while (offset != -1) {
    val.Replace(offset, 1, ',');
    offset = val.FindChar(10, offset + 2);
  }
}

NS_IMETHODIMP ImportAddressImpl::GetSampleData(int32_t index, bool* pFound,
                                               char16_t** pStr) {
  NS_ASSERTION(pFound != nullptr, "null ptr");
  NS_ASSERTION(pStr != nullptr, "null ptr");
  if (!pFound || !pStr) return NS_ERROR_NULL_POINTER;

  if (!m_fileLoc) {
    IMPORT_LOG0("*** Error, called GetSampleData before SetSampleLocation\n");
    return NS_ERROR_FAILURE;
  }

  nsresult rv;
  *pStr = nullptr;
  char16_t term = 0;

  if (!m_haveDelim) {
    rv = m_text.DetermineDelim(m_fileLoc);
    NS_ENSURE_SUCCESS(rv, rv);
    m_haveDelim = true;
    m_delim = m_text.GetDelim();
  }

  bool fileExists;
  rv = m_fileLoc->Exists(&fileExists);
  NS_ENSURE_SUCCESS(rv, rv);

  if (!fileExists) {
    *pFound = false;
    *pStr = NS_xstrdup(&term);
    return NS_OK;
  }

  nsAutoString line;
  rv = nsTextAddress::ReadRecordNumber(m_fileLoc, line, index);
  if (NS_SUCCEEDED(rv)) {
    nsString str;
    nsString field;
    int32_t fNum = 0;
    while (nsTextAddress::GetField(line, fNum, field, m_delim)) {
      if (fNum) str.Append(char16_t('\n'));
      SanitizeSampleData(field);
      str.Append(field);
      fNum++;
      field.Truncate();
    }

    *pStr = ToNewUnicode(str);
    *pFound = true;

    /* IMPORT_LOG1("Sample data: %S\n", str.get()); */
  } else {
    *pFound = false;
    *pStr = NS_xstrdup(&term);
  }

  return NS_OK;
}

NS_IMETHODIMP ImportAddressImpl::SetSampleLocation(nsIFile* pLocation) {
  NS_ENSURE_ARG_POINTER(pLocation);

  m_fileLoc = pLocation;
  m_haveDelim = false;
  return NS_OK;
}

void ImportAddressImpl::ClearSampleFile(void) {
  m_fileLoc = nullptr;
  m_haveDelim = false;
}

NS_IMETHODIMP ImportAddressImpl::InitFieldMap(nsIImportFieldMap* fieldMap) {
  // Let's remember the last one the user used!
  // This should be normal for someone importing multiple times, it's usually
  // from the same file format.

  nsresult rv;
  nsCOMPtr<nsIPrefBranch> prefs(do_GetService(NS_PREFSERVICE_CONTRACTID, &rv));
  if (NS_SUCCEEDED(rv)) {
    nsCString prefStr;
    rv = prefs->GetCharPref("mailnews.import.text.fieldmap", prefStr);
    if (NS_SUCCEEDED(rv)) {
      const char* pStr = prefStr.get();
      if (pStr) {
        fieldMap->SetFieldMapSize(0);
        long fNum;
        bool active;
        long fIndex = 0;
        while (*pStr) {
          while (*pStr && (*pStr != '+') && (*pStr != '-')) pStr++;
          if (*pStr == '+')
            active = true;
          else if (*pStr == '-')
            active = false;
          else
            break;
          fNum = 0;
          while (*pStr && ((*pStr < '0') || (*pStr > '9'))) pStr++;
          if (!(*pStr)) break;
          while (*pStr && (*pStr >= '0') && (*pStr <= '9')) {
            fNum *= 10;
            fNum += (*pStr - '0');
            pStr++;
          }
          while (*pStr && (*pStr != ',')) pStr++;
          if (*pStr == ',') pStr++;
          if (!active) {
            fNum *= -1;  // Re-add the stripped minus sign.
          }
          fieldMap->SetFieldMap(-1, fNum);
          fieldMap->SetFieldActive(fIndex, active);
          fIndex++;
        }
        if (!fIndex) {
          int num;
          fieldMap->GetNumMozFields(&num);
          fieldMap->DefaultFieldMap(num);
        }
      }
    }

    // Now also get the last used skip first record value.
    bool skipFirstRecord = false;
    rv = prefs->GetBoolPref("mailnews.import.text.skipfirstrecord",
                            &skipFirstRecord);
    if (NS_SUCCEEDED(rv)) fieldMap->SetSkipFirstRecord(skipFirstRecord);
  }

  return NS_OK;
}

void ImportAddressImpl::SaveFieldMap(nsIImportFieldMap* pMap) {
  if (!pMap) return;

  int size;
  int index;
  bool active;
  nsCString str;

  pMap->GetMapSize(&size);
  for (long i = 0; i < size; i++) {
    index = i;
    active = false;
    pMap->GetFieldMap(i, &index);
    pMap->GetFieldActive(i, &active);
    if (active)
      str.Append('+');
    else
      str.Append('-');

    str.AppendInt(index);
    str.Append(',');
  }

  nsresult rv;
  nsCOMPtr<nsIPrefBranch> prefs(do_GetService(NS_PREFSERVICE_CONTRACTID, &rv));

  if (NS_SUCCEEDED(rv)) {
    nsCString prefStr;
    rv = prefs->GetCharPref("mailnews.import.text.fieldmap", prefStr);
    if (NS_FAILED(rv) || !str.Equals(prefStr))
      rv = prefs->SetCharPref("mailnews.import.text.fieldmap", str);
  }

  // Now also save last used skip first record value.
  bool skipFirstRecord = false;
  rv = pMap->GetSkipFirstRecord(&skipFirstRecord);
  if (NS_SUCCEEDED(rv))
    prefs->SetBoolPref("mailnews.import.text.skipfirstrecord", skipFirstRecord);
}
