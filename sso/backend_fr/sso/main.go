package main

import (
	"fmt"
	"log"

	"github.com/sso/sso-be/sso/cmd"
)

func main() {
	fmt.Println("======================================")
	fmt.Println("SERVER IS STARTING: main() execution")
	fmt.Println("======================================")
	if err := cmd.Execute(); err != nil {
		fmt.Println("SERVER FATAL ERROR:", err)
		log.Fatal(err)
	}
	fmt.Println("SERVER STOPPED NORMALLY")
}
