#!/bin/bash

# apiパッケージをアプデ
apt update -y

# HTTPS経由でaptがリポジトリを使用できるようにするためのパッケージのインストール
apt install -y curl \
	apt-transport-https \
	ca-certificates \
	software-properties-common \
	linux-modules-extra-raspi

# Docker’s official GPG keyを追加
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor \
	-o /usr/share/keyrings/docker-archive-keyring.gpg

#リポジトリを設定
add-apt-repository "deb \
	[arch=$(dpkg --print-architecture) \
	signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
	https://download.docker.com/linux/ubuntu \
	$(lsb_release -cs) \
	stable"

#docker install
apt install -y docker-ce docker-ce-cli containerd.io

# ユーザー権限でdokcerコマンドを使えれるように
usermod -aG docker ${USER}
chmod 666 /var/run/docker.sock

read -n1 -p "dockerを使うために再起動するよ? [Y/n]" yn;
if [[ $yn = [yY] ]]; then
	reboot
else
	echo "手動で再起動してね"
fi