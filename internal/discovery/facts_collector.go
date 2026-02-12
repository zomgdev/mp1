package discovery

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"golang.org/x/crypto/ssh"
)

type SSHAuth struct {
	Login    string
	Password string
	Key      string
}

type FactsCollector interface {
	CollectFacts(ctx context.Context, ip string, auth SSHAuth) (facts string, logFile string, err error)
}

type SSHFactsCollector struct {
	port    int
	timeout time.Duration
	logDir  string
	now     func() time.Time
}

func NewSSHFactsCollector(port int, timeout time.Duration, logDir string) *SSHFactsCollector {
	if port <= 0 {
		port = 22
	}
	if timeout <= 0 {
		timeout = 10 * time.Second
	}

	return &SSHFactsCollector{
		port:    port,
		timeout: timeout,
		logDir:  logDir,
		now:     time.Now,
	}
}

func (c *SSHFactsCollector) CollectFacts(ctx context.Context, ip string, auth SSHAuth) (string, string, error) {
	logFile, logger, closer, err := c.openLog()
	if err != nil {
		return "", "", err
	}
	defer closer()

	logger.Printf("start discovery ip=%s", ip)

	config, err := c.buildSSHClientConfig(auth)
	if err != nil {
		logger.Printf("ssh config error: %v", err)
		return "", logFile, err
	}

	address := net.JoinHostPort(ip, strconv.Itoa(c.port))
	logger.Printf("dial ssh address=%s user=%s", address, auth.Login)

	client, err := c.dialSSH(ctx, address, config)
	if err != nil {
		logger.Printf("ssh dial failed: %v", err)
		return "", logFile, err
	}
	defer client.Close()

	logger.Printf("ssh connected")
	session, err := client.NewSession()
	if err != nil {
		logger.Printf("ssh session failed: %v", err)
		return "", logFile, err
	}
	defer session.Close()

	const command = "cat /etc/os-release"
	logger.Printf("exec command=%q", command)
	output, err := session.CombinedOutput(command)
	if err != nil {
		logger.Printf("command failed: %v", err)
		logger.Printf("command output:\n%s", bytes.TrimSpace(output))
		return "", logFile, fmt.Errorf("ssh command failed: %w", err)
	}

	facts := string(bytes.TrimSpace(output))
	logger.Printf("command output:\n%s", facts)
	logger.Printf("done discovery ip=%s", ip)

	return facts, logFile, nil
}

func (c *SSHFactsCollector) buildSSHClientConfig(auth SSHAuth) (*ssh.ClientConfig, error) {
	if auth.Login == "" {
		return nil, fmt.Errorf("missing ssh login in hosts file")
	}
	if auth.Password == "" {
		return nil, fmt.Errorf("missing ssh password in hosts file")
	}

	authMethods := []ssh.AuthMethod{ssh.Password(auth.Password)}
	if auth.Key != "" {
		signer, err := loadPrivateKeySigner(auth.Key)
		if err != nil {
			return nil, fmt.Errorf("failed to load ssh key: %w", err)
		}
		authMethods = append(authMethods, ssh.PublicKeys(signer))
	}

	config := &ssh.ClientConfig{
		User:            auth.Login,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         c.timeout,
	}

	return config, nil
}

func (c *SSHFactsCollector) dialSSH(ctx context.Context, address string, config *ssh.ClientConfig) (*ssh.Client, error) {
	dialer := &net.Dialer{Timeout: c.timeout}
	rawConn, err := dialer.DialContext(ctx, "tcp", address)
	if err != nil {
		return nil, err
	}

	conn, chans, reqs, err := ssh.NewClientConn(rawConn, address, config)
	if err != nil {
		_ = rawConn.Close()
		return nil, err
	}

	return ssh.NewClient(conn, chans, reqs), nil
}

func (c *SSHFactsCollector) openLog() (string, *log.Logger, func(), error) {
	if err := os.MkdirAll(c.logDir, 0755); err != nil {
		return "", nil, nil, err
	}

	filename := fmt.Sprintf("discover_%s.log", c.now().Format("20060102150405"))
	fullPath := filepath.Join(c.logDir, filename)

	file, err := os.OpenFile(fullPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return "", nil, nil, err
	}

	logger := log.New(file, "", log.LstdFlags)
	closer := func() {
		_ = file.Close()
	}

	return fullPath, logger, closer, nil
}

func loadPrivateKeySigner(path string) (ssh.Signer, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	return ssh.ParsePrivateKey(raw)
}
