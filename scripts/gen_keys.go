package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"os"
	"path/filepath"
)

func main() {
	keysDir := filepath.Join("shared", "keys")
	if err := os.MkdirAll(keysDir, 0755); err != nil {
		fmt.Printf("Gagal membuat direktori keys: %v\n", err)
		os.Exit(1)
	}

	privateKeyPath := filepath.Join(keysDir, "jwt_private.pem")
	publicKeyPath := filepath.Join(keysDir, "jwt_public.pem")

	// Generate 2048-bit RSA key
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		fmt.Printf("Gagal generate RSA key: %v\n", err)
		os.Exit(1)
	}

	// Export Private Key to PKCS#8 PEM
	pkcs8Bytes, err := x509.MarshalPKCS8PrivateKey(privateKey)
	if err != nil {
		fmt.Printf("Gagal marshal private key: %v\n", err)
		os.Exit(1)
	}
	privBlock := &pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: pkcs8Bytes,
	}
	privFile, err := os.Create(privateKeyPath)
	if err != nil {
		fmt.Printf("Gagal membuat file private key: %v\n", err)
		os.Exit(1)
	}
	defer privFile.Close()
	if err := pem.Encode(privFile, privBlock); err != nil {
		fmt.Printf("Gagal encode private key: %v\n", err)
		os.Exit(1)
	}

	// Export Public Key to PKIX PEM
	pubBytes, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	if err != nil {
		fmt.Printf("Gagal marshal public key: %v\n", err)
		os.Exit(1)
	}
	pubBlock := &pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubBytes,
	}
	pubFile, err := os.Create(publicKeyPath)
	if err != nil {
		fmt.Printf("Gagal membuat file public key: %v\n", err)
		os.Exit(1)
	}
	defer pubFile.Close()
	if err := pem.Encode(pubFile, pubBlock); err != nil {
		fmt.Printf("Gagal encode public key: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Kunci RSA 2048-bit berhasil dibuat:")
	fmt.Printf(" - Private Key: %s\n", privateKeyPath)
	fmt.Printf(" - Public Key : %s\n", publicKeyPath)
}
