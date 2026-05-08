import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from '@react-email/components'
import {
  LOGO_URL,
  codeStyle,
  container,
  footer,
  h1,
  logo,
  logoWrap,
  main,
  text,
} from './_shared'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Bestätigungscode</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoWrap}>
          <Img src={LOGO_URL} alt="carforms" style={logo} />
        </div>
        <Heading style={h1}>Erneute Bestätigung</Heading>
        <Text style={text}>
          Verwende den folgenden Code, um deine Identität zu bestätigen:
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Der Code läuft in Kürze ab. Falls du das nicht angefordert hast,
          kannst du diese E-Mail ignorieren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
