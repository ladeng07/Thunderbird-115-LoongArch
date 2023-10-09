#!/usr/bin/python3

# Copyright 2021, Carsten Schoenert <carsten.schoenert@t-online.de>
# SPDX-License-Identifier:  GPL-2.0+

# Simple check if the thunderbird binary is trying to successfully read any
# content of the folder /usr/lib/thunderbird/defaults/syspref which is a
# symlink to /etc/thunderbird/pref/ even if the folder is empty.
#
# Purpose if this check is to ensure we don't have disabled the inclusion of
# this folder for Thunderbird by accident as we ship important default settings
# within this folder.

import subprocess
import sys

# Set the CLI call we want to inspect.
command = 'strace -e trace=access thunderbird -h'
pattern = '/usr/lib/thunderbird/defaults/syspref'

# Setup the sub-process object.
proc = subprocess.Popen(command,
                  shell=True,
                  stdin=subprocess.PIPE,
                  stdout=subprocess.PIPE,
                  stderr=subprocess.PIPE)

# Execute the call.
stdout_value,stderr_value = proc.communicate()

# Once we have a valid response, split the return output. Currently we are not
# (yet) interested on the content for stdout.
if stdout_value:
    stdout_value = stdout_value.split()

# Processing and output the check.
print(f'\nOutput on stderr for command \'{command}\':\n')

for line in stderr_value.splitlines():
    print(line.decode('utf-8'))
print()

print('Analysing strace call:')
for line in stderr_value.splitlines():
    if f'{pattern}' in line.decode('utf-8'):
        print(f'\tPattern for accessing \"{pattern}\" found.')
        print('\t\t' + '---> ' + line.decode('utf-8'))
        if '0' in line.decode('utf-8').split('=')[1].lstrip():
            print(f'\tAccess to folder/symlink \'{pattern}\' marked as successful (found F_OK = 0)')
            print('\tCheck SUCCESSFUL!\n')
            sys.exit(0)

        else:
            print(f'\tFailed to access to folder/symlink \'{pattern}\'!!!')
            print('\tCheck FAILED!\n')
            sys.exit(1)

# If we going until here we need to fix something! :-(
print(f'\tPattern for accessing \"{pattern}\" wasn\'t found!!!')
print('\tCheck FAILED!\n')
sys.exit(1)
