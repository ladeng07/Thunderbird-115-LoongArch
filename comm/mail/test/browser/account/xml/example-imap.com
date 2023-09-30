<?xml version="1.0" encoding="UTF-8"?>
<clientConfig>
  <emailProvider id="example-imap.com">
    <domain>example-imap.com</domain>
    <displayName>Example Två</displayName>
    <incomingServer type="imap">
      <hostname>localhost</hostname>
      <port>1993</port>
      <socketType>plain</socketType>
      <username>john.doe@example-imap.com</username>
      <password>abc12345</password>
      <authentication>plain</authentication>
    </incomingServer>
    <outgoingServer type="smtp">
      <hostname>localhost</hostname>
      <port>1587</port>
      <socketType>plain</socketType>
      <username>john.doe@example-imap.com</username>
      <password>abc12345</password>
      <authentication>plain</authentication>
      <addThisServer>true</addThisServer>
      <useGlobalPreferredServer>false</useGlobalPreferredServer>
    </outgoingServer>
  </emailProvider>
</clientConfig>
